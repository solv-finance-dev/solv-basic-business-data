import type { HandlerParam } from '../../types/handler';
import NavRecords from '../../models/NavRecords';

// 处理 OpenFundMarket 的 SetRedeemNav/SetSubscribeNav 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction, config } = param;

    const poolId = args.poolId !== undefined ? String(args.poolId) : undefined;
    if (!poolId) {
        return;
    }

    const existing = await NavRecords.findOne({
        where: {
            chainId: event.chainId,
            poolId,
            txHash: event.transactionHash,
            eventIndex: event.logIndex,
            transactionIndex: event.transactionIndex,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    const navType = 'Redemption';

    const nav = args.nav !== undefined ? String(args.nav) : undefined;
    const time = args.time !== undefined ? String(args.time) : undefined;

    await NavRecords.create(
        {
            chainId: event.chainId,
            poolId,
            navType,
            nav,
            time,
            txHash: event.transactionHash,
            transactionIndex: event.transactionIndex,
            eventIndex: event.logIndex,
            lastUpdated: event.blockTimestamp,
        },
        { transaction },
    );

    console.log('NavRecordsHandler: created record for txHash ', event.transactionHash, ' eventId ', event.eventId);
}
