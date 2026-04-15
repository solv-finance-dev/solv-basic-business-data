import {fetchChainEvents, getChainConfigs, getTemplateAddressesMap} from './services/evmService';
import {getLastSyncedBlock, setLastSyncedBlock} from './data/evmSyncState';
import {initHandlersConfig, routerEvent} from './services/monitorService';
import {EventEvm} from './types/eventEvm';
import type {ChainConfig} from './types/config';
import {getRawSequelize} from "./lib/dbClient";
import {getRedisClient} from "./lib/redis";
import {sendDelayQueueMessageNow} from "./lib/sqs";
import {getLatestBlockNumber} from './lib/rpc';
import {sendSNS} from "./lib/sns";
// ─── BEGIN: market scheduler integration (10-endpoint migration) ───
import {main as schedulerMain} from './scheduler';
// ─── END: market scheduler integration ───

// 轮询上游服务的默认间隔。 默认10秒
const DEFAULT_INTERVAL_MS = 10000;

export async function main() {
    let running = false;
    const intervalMs = Number(process.env.MONITOR_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);

    initHandlersConfig();
    console.log('init handlers config');

    setInterval(() => {
        if (running) {
            console.info('EVM Event Monitor: Previous cycle still running, skip.');
            return;
        }

        running = true;
        void runCycle().catch((error) => {
            console.error('EVM Event Monitor: Error in main cycle:', error);
        }).finally(() => {
            running = false;
        });
    }, intervalMs);

    // ─── BEGIN: market scheduler integration (10-endpoint migration) ───
    // marketScheduler shares the same Node process with evmEventMonitor.
    // Production Dockerfile CMD unchanged (still node build/evmEventMonitor.js).
    // marketScheduler.main() uses setInterval internally, returns immediately, non-blocking.
    schedulerMain().catch((err) => {
        console.error('[main] marketScheduler failed to start:', err);
    });
    // ─── END: market scheduler integration ───
}

async function runCycle(): Promise<void> {1
    console.log('EVM Event Monitor: Starting new cycle...');
    // 获取所有要同步的链配置
    const chains: ChainConfig[] = getChainConfigs();

    // 这里不同的链并行执行
    const tasks: Array<Promise<void>> = chains.map((chain: ChainConfig) => processChain(chain));
    // 等待所有链的任务完成
    const results: Array<PromiseSettledResult<void>> = await Promise.allSettled(tasks);
    results.forEach((result: PromiseSettledResult<void>, index: number) => {
        if (result.status === 'rejected') {
            console.error('EVM Event Monitor: Chain task failed.', chains[index].chainId, result.reason);
            sendSNS(`chainId:${chains[index].chainId},reason:${result.reason.toString()}`, "basic-business-data 处理发现异常 ");
        }
    });

    console.log('EVM Event Monitor: Cycle completed.');
}

async function processChain(chain: ChainConfig): Promise<void> {
    const redisClient = await getRedisClient();
    const isStop = await redisClient.get('StopMonitorChainId_' + chain.chainId);
    // console.log("StopMonitorChainId_" + chain.chainId + ":", isStop)
    if (isStop == null || isStop === '1') {
        console.log('EVM Event Monitor: Monitor is stopped for chainId', chain.chainId, ', skipping this cycle.');
        return;
    }

    const lastSyncedBlock = await getLastSyncedBlock(chain.chainId);
    console.log('getLastSyncedBlock:', lastSyncedBlock, 'chainId:', chain.chainId);
    const beginBlockNumber = lastSyncedBlock === null ? chain.startBlockNumber : lastSyncedBlock + 1;

    let maxBlockNumber: number | undefined;
    if (chain.delayBlock !== undefined && chain.delayBlock !== null) {
        const delayBlock = Number(chain.delayBlock);
        if (Number.isFinite(delayBlock) && delayBlock >= 0) {
            const latestBlockNumber = await getLatestBlockNumber(chain.chainId);
            // 这里要额外+1，是因为maxBlockNumber是后续查询的开区间
            maxBlockNumber = latestBlockNumber - delayBlock + 1;
            if (maxBlockNumber < beginBlockNumber) {
                console.log(`EVM Event Monitor: maxBlockNumber is behind beginBlockNumber. chainId: ${chain.chainId}, beginBlockNumber: ${beginBlockNumber}, latestBlockNumber: ${latestBlockNumber}, delayBlock: ${delayBlock}, maxBlockNumber: ${maxBlockNumber}`);
                return;
            }
        } else {
            console.warn(`EVM Event Monitor: invalid delayBlock config, ignored. chainId: ${chain.chainId}, delayBlock: ${chain.delayBlock}`);
        }
    }

    const events = await fetchChainEvents(chain.chainId, beginBlockNumber, chain.blockLimit, maxBlockNumber);
    console.log(`fetchChainEvents: Fetched ${events.length} events for chain ${chain.chainId} from block ${beginBlockNumber} to ${maxBlockNumber ?? 'latest'}`);

    const templateAddressesMap = await getTemplateAddressesMap(chain.chainId);

    if (!events.length) {
        return;
    }

    const blocks = groupEventsByBlock(events);
    const sortedBlockNumbers = Array.from(blocks.keys()).sort((a, b) => a - b);

    for (const blockNumber of sortedBlockNumbers) {
        const blockEvents = blocks.get(blockNumber) ?? [];
        if (!blockEvents.length) {
            continue;
        }

        // 按 logIndex 升序排序
        blockEvents.sort((a, b) => a.logIndex - b.logIndex);

        const sequelize = await getRawSequelize();
        const transaction = await sequelize.transaction();

        try {
            await routerEvent(blockEvents, templateAddressesMap, transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            // 生成uuid
            const uuid = crypto.randomUUID();
            // 从blockEvents里获取id作为id的数组合集
            const eventIds = blockEvents.map(e => e.eventId).join(',');
            console.error(`EVM Event Monitor: Error processing block,uuid:${uuid},blockNumber: ${blockNumber},chainId: ${chain.chainId},eventIds: ${eventIds}`, error);
            await sendSNS(`uuid:${uuid},chainId:${chain.chainId},blockNumber:${blockNumber},reason:${error ? error.toString() : 'unknown'}`, "basic-business-data 处理routerEvent异常 ");
            throw error;
        }
        const sqsCount = await sendDelayQueueMessageNow(chain.chainId);
        console.log(`flush delay sqs done for block ${blockNumber} on chain ${chain.chainId}, messages sent: ${sqsCount}`);
        await setLastSyncedBlock(chain.chainId, blockNumber);
        console.log('setLastSyncedBlock:', blockNumber);
    }
}

function groupEventsByBlock(events: EventEvm[]): Map<number, EventEvm[]> {
    const grouped = new Map<number, EventEvm[]>();

    for (const event of events) {
        const blockNumber = Number(event.blockNumber);
        if (!Number.isFinite(blockNumber)) {
            console.warn('EVM Event Monitor: Invalid blockNumber, skip event.', event.eventId);
            continue;
        }

        const bucket = grouped.get(blockNumber);
        if (bucket) {
            bucket.push(event);
        } else {
            grouped.set(blockNumber, [event]);
        }
    }

    return grouped;
}

main().catch((e) => console.error(e));
