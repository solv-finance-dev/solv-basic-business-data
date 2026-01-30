import type {HandlerParam} from '../../types/handler';
import MarketInfo from '../../models/MarketInfo';

// 处理 OpenFundMarket 的 SetProtocolFeeCollector/SetProtocolFeeRate 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {eventSignature, event, args, transaction} = param;
    const contractAddress = event.contractAddress.toLowerCase();

    const existing = await MarketInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress,
        },
        transaction,
    });

    if (!existing) {
        console.log('MarketInfoHandler: record not found for event ', JSON.stringify({
            eventId: event.id,
            eventSignature,
            chainId: event.chainId,
            contractAddress,
            args,
        }));
        return;
    }

    if (eventSignature === 'SetProtocolFeeCollector(address,address)') {
        const newFeeCollector = args.newFeeCollector !== undefined ? String(args.newFeeCollector).toLowerCase() : '';
        if (!newFeeCollector) {
            return;
        }
        await existing.update({
            protocolFeeCollector: newFeeCollector,
        }, {transaction});
        console.log('MarketInfoHandler: updated protocolFeeCollector for contract ', contractAddress, ' eventId ', event.eventId);
        return;
    }

    if (eventSignature === 'SetProtocolFeeRate(uint256,uint256)') {
        const newFeeRate = args.newFeeRate !== undefined ? String(args.newFeeRate) : undefined;
        if (!newFeeRate) {
            return;
        }
        await existing.update({
            protocolFeeRate: newFeeRate,
        }, {transaction});
        console.log('MarketInfoHandler: updated protocolFeeRate for contract ', contractAddress, ' eventId ', event.eventId);
    }
}
