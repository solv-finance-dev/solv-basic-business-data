import type { HandlerParam } from '../../types/handler';
import {OptRawNavHistoryPool} from "@solvprotocol/models";
import {NavRecords} from "@solvprotocol/models";
import { sendQueueMessage } from '../../lib/sqs';

const NAV_TYPE = {
    INVESTMENT: 'Investment',
    REDEMPTION: 'Redemption',
} as const;

interface EventInfo {
    chainId: number;
    poolId: string;
    nav: string;
    timestamp: number;
    txHash: string;
    transactionIndex: number;
    eventIndex: number;
}

function extractEventInfo(event: any, args: Record<string, unknown>): EventInfo {
    return {
        chainId: event.chainId,
        poolId: String(args.poolId ?? ''),
        nav: String(args.nav ?? ''),
        timestamp: event.blockTimestamp,
        txHash: event.transactionHash,
        transactionIndex: event.transactionIndex,
        eventIndex: event.logIndex,
    };
}

function validateEventData(poolId: string, nav: string, time?: number): void {
    if (!poolId) {
        throw new Error('NavHistoryPoolHandler: poolId is required');
    }
    if (!nav) {
        throw new Error('NavHistoryPoolHandler: nav is required');
    }
    if (time !== undefined && time <= 0) {
        throw new Error('NavHistoryPoolHandler: time must be positive');
    }
}

// 统一创建或更新 NavHistoryPool 并发送 SQS
async function upsertNavHistoryPoolAndSendSQS(
    chainId: number,
    poolId: string,
    navType: string,
    time: number,
    nav: string,
    lastUpdated: number,
    transaction: any
): Promise<void> {
    const [navHistoryPool, created] = await OptRawNavHistoryPool.findOrCreate({
        where: {
            poolId,
            navType,
            time,
        },
        defaults: {
            poolId,
            navType,
            time,
            nav,
            lastUpdated,
        },
        transaction,
    });

    // 如果记录已存在，更新相关信息
    if (!created) {
        await navHistoryPool.update(
            {
                nav,
                lastUpdated,
            },
            { transaction }
        );
    }

    // 成功之后发送 SQS 消息
    if (navHistoryPool && navHistoryPool.id) {
        try {
            await sendQueueMessage(chainId, 'assetQueue', {
                source: 'V3_5_Raw_Nav_History_Pool',
                data: {
                    id: Number(navHistoryPool.id),
                    chainId: String(chainId),
                    poolId: poolId,
                },
            });
        } catch (error) {
            console.error('NavHistoryPoolHandler: Failed to send SQS message for nav history pool', {
                id: navHistoryPool.id,
                chainId,
                poolId,
                navType,
                time,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

async function handleSetRedeemNavEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const eventInfo = extractEventInfo(event, args);
    const timestamp = eventInfo.timestamp;

    validateEventData(eventInfo.poolId, eventInfo.nav, timestamp);

    await upsertNavHistoryPoolAndSendSQS(
        eventInfo.chainId,
        eventInfo.poolId,
        NAV_TYPE.REDEMPTION,
        timestamp,
        eventInfo.nav,
        timestamp,
        transaction
    );

    await upsertNavHistoryPoolAndSendSQS(
        eventInfo.chainId,
        eventInfo.poolId,
        NAV_TYPE.INVESTMENT,
        timestamp,
        eventInfo.nav,
        timestamp,
        transaction
    );
}

async function handleSetSubscribeNavEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const eventInfo = extractEventInfo(event, args);
    const time = Number(args.time ?? 0);

    validateEventData(eventInfo.poolId, eventInfo.nav, time);

    await upsertNavHistoryPoolAndSendSQS(
        eventInfo.chainId,
        eventInfo.poolId,
        NAV_TYPE.INVESTMENT,
        time,
        eventInfo.nav,
        eventInfo.timestamp,
        transaction
    );
}

export async function handleNavHistoryPoolEvent(param: HandlerParam): Promise<void> {
    const { eventFunc } = param;

    if (eventFunc === 'SetSubscribeNav(bytes32,uint256,uint256)') {
        await handleSetSubscribeNavEvent(param);
    } else if (eventFunc === 'SetRedeemNav(bytes32,uint256,uint256)') {
        await handleSetRedeemNavEvent(param);
    }
}