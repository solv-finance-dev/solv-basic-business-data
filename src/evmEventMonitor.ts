import {fetchChainEvents, getChainConfigs} from './services/evmService';
import {getLastSyncedBlock, setLastSyncedBlock} from './data/evmSyncState';
import {initHandlersConfig, routerEvent} from './services/monitorService';
import {EventEvm} from './types/event';
import type {ChainConfig} from './types/config';
import {initSequelize} from './lib/db';

// 轮询上游服务的默认间隔。 默认10秒
const DEFAULT_INTERVAL_MS = 10000;

export async function main() {
    let running = false;
    const intervalMs = Number(process.env.MONITOR_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);

    initHandlersConfig();
    console.log('init Handlers Config');
    void runCycle().catch((error) => {
        console.error('EVM Event Monitor: Error in main cycle:', error);
    }).finally(() => {
        running = false;
    });

    // setInterval(() => {
    //     if (running) {
    //         console.warn('EVM Event Monitor: Previous cycle still running, skip.');
    //         return;
    //     }
    //
    //     running = true;
    //     void runCycle().catch((error) => {
    //         console.error('EVM Event Monitor: Error in main cycle:', error);
    //     }).finally(() => {
    //         running = false;
    //     });
    // }, intervalMs);
}

async function runCycle(): Promise<void> {
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
        }
    });

    console.log('EVM Event Monitor: Cycle completed.');
}

async function processChain(chain: ChainConfig): Promise<void> {
    const lastSyncedBlock = await getLastSyncedBlock(chain.chainId);
    const beginBlockNumber = lastSyncedBlock === null ? chain.startBlockNumber : lastSyncedBlock + 1;

    const events = await fetchChainEvents(chain.chainId, beginBlockNumber, chain.blockLimit);
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

        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        try {
            await routerEvent(blockEvents, transaction);
            await transaction.commit();
            await setLastSyncedBlock(chain.chainId, blockNumber);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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
