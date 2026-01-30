import type { HandlerParam } from '../../types/handler';
import OptRawNavHistoryPool from '../../models/RawOptNavHistoryPool';
import NavRecords from '../../models/NavRecords';

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

async function createNavHistoryPool(
    poolId: string,
    navType: string,
    time: number,
    nav: string,
    lastUpdated: number,
    transaction: any
): Promise<void> {
    await OptRawNavHistoryPool.create(
        {
            poolId,
            navType,
            time,
            nav,
            lastUpdated,
        },
        { transaction }
    );
}

async function upsertNavHistoryPool(
    poolId: string,
    navType: string,
    time: number,
    nav: string,
    lastUpdated: number,
    transaction: any
): Promise<void> {
    const existing = await OptRawNavHistoryPool.findOne({
        where: {
            poolId,
            navType,
            time,
        },
        transaction,
    });

    if (existing) {
        await existing.update(
            {
                nav,
                lastUpdated,
            },
            { transaction }
        );
    } else {
        await OptRawNavHistoryPool.create(
            {
                poolId,
                navType,
                time,
                nav,
                lastUpdated,
            },
            { transaction }
        );
    }
}

async function createNavRecord(
    eventInfo: EventInfo,
    navType: string,
    time: number,
    transaction: any
): Promise<void> {
    // 检查记录是否已存在（基于唯一约束：tx_hash, transaction_index, event_index, pool_id）
    const existing = await NavRecords.findOne({
        where: {
            txHash: eventInfo.txHash,
            transactionIndex: eventInfo.transactionIndex,
            eventIndex: eventInfo.eventIndex,
            poolId: eventInfo.poolId,
        },
        transaction,
    });

    // 如果记录已存在，跳过创建（避免唯一约束冲突）
    if (existing) {
        return;
    }

    await NavRecords.create(
        {
            chainId: eventInfo.chainId,
            poolId: eventInfo.poolId,
            navType,
            time: time.toString(),
            nav: eventInfo.nav,
            txHash: eventInfo.txHash,
            transactionIndex: eventInfo.transactionIndex,
            eventIndex: eventInfo.eventIndex,
            lastUpdated: eventInfo.timestamp,
        },
        { transaction }
    );
}

async function handleSetRedeemNavEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const eventInfo = extractEventInfo(event, args);
    const timestamp = eventInfo.timestamp;

    validateEventData(eventInfo.poolId, eventInfo.nav, timestamp);

    await createNavHistoryPool(
        eventInfo.poolId,
        NAV_TYPE.REDEMPTION,
        timestamp,
        eventInfo.nav,
        timestamp,
        transaction
    );

    await upsertNavHistoryPool(
        eventInfo.poolId,
        NAV_TYPE.INVESTMENT,
        timestamp,
        eventInfo.nav,
        timestamp,
        transaction
    );

    await createNavRecord(eventInfo, NAV_TYPE.REDEMPTION, timestamp, transaction);
}

async function handleSetSubscribeNavEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const eventInfo = extractEventInfo(event, args);
    const time = Number(args.time ?? 0);

    validateEventData(eventInfo.poolId, eventInfo.nav, time);

    await upsertNavHistoryPool(
        eventInfo.poolId,
        NAV_TYPE.INVESTMENT,
        time,
        eventInfo.nav,
        eventInfo.timestamp,
        transaction
    );

    await createNavRecord(eventInfo, NAV_TYPE.INVESTMENT, time, transaction);
}

export async function handleNavHistoryPoolEvent(param: HandlerParam): Promise<void> {
    const { eventFunc } = param;

    if (eventFunc === 'SetSubscribeNav(bytes32,uint256,uint256)') {
        await handleSetSubscribeNavEvent(param);
    } else if (eventFunc === 'SetRedeemNav(bytes32,uint256,uint256)') {
        await handleSetRedeemNavEvent(param);
    }
}