import type {HandlerParam} from '../../types/handler';
import ProtocolFeeCollectorHistory from '../../models/ProtocolFeeCollectoHistory';

// 处理 OpenFundMarket 的 SetProtocolFeeCollector 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {event, args, transaction} = param;
    const newFeeCollector = String(args.newFeeCollector ?? '');

    if (!newFeeCollector) {
        return;
    }

    const existing = await ProtocolFeeCollectorHistory.findOne({
        where: {
            chainId: event.chainId,
            protocolFeeCollector: newFeeCollector,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    await ProtocolFeeCollectorHistory.create(
        {
            chainId: event.chainId,
            protocolFeeCollector: newFeeCollector,
            lastUpdated: event.blockTimestamp,
        },
        {transaction},
    );

    console.log('ProtocolFeeCollectorHistoryHandler: created record for protocolFeeCollector ', newFeeCollector, ' eventId ', event.eventId);
}
