import type {HandlerParam} from '../../types/handler';
import CarryCollectorHistory from '../../models/CarryCollectoHistory';

// 处理 OpenFundMarket 的 CreatePool/UpdatePoolInfo 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {args, event, transaction} = param;
    const newCarryCollector = String(args.newCarryCollector ?? '');

    if (!newCarryCollector) {
        return;
    }

    const existing = await CarryCollectorHistory.findOne({
        where: {
            chainId: event.chainId,
            carryCollector: newCarryCollector,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    await CarryCollectorHistory.create(
        {
            chainId: event.chainId,
            carryCollector: newCarryCollector,
            lastUpdated: event.blockTimestamp,
        },
        {transaction},
    );
    console.log('CarryCollectoHistoryHandler: created record for carryCollector ', newCarryCollector, ' eventId ', event.eventId);
}
