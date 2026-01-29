import type {HandlerParam} from '../../types/handler';
import ProtocolFeeInfo from '../../models/ProtocolFeeInfo';

// 处理 OpenFundMarket 的 SettleProtocolFee 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {event, args, transaction} = param;

    const poolId = args.poolId !== undefined ? String(args.poolId).toLowerCase() : undefined;
    if (!poolId) {
        return;
    }

    const existing = await ProtocolFeeInfo.findOne({
        where: {
            chainId: event.chainId,
            txHash: event.transactionHash,
            eventIndex: event.logIndex,
            transactionIndex: event.transactionIndex,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    const currency = args.currency !== undefined ? String(args.currency).toLowerCase() : undefined;
    const protocolFeeAmount = args.protocolFeeAmount !== undefined ? String(args.protocolFeeAmount) : undefined;

    await ProtocolFeeInfo.create(
        {
            chainId: event.chainId,
            poolId,
            protocolFeeAmount,
            currencyAddress: currency,
            txHash: event.transactionHash,
            transactionIndex: event.transactionIndex,
            eventIndex: event.logIndex,
            lastUpdated: event.blockTimestamp,
        },
        {transaction},
    );

    console.log('ProtocolFeeInfoHandler: created record for txHash ', event.transactionHash, ' eventId ', event.eventId);
}
