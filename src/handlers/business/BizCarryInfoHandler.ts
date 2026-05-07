import type {HandlerParam} from '../../types/handler';
import {getBusinessSequelize} from '../../lib/dbClient';
import BizCarryInfo from '../../models/business/BizCarryInfo';

// 处理 OpenFundMarket 的 SettleCarry 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {event, args, bizTransaction} = param;

    await getBusinessSequelize();

    const existing = await BizCarryInfo.findOne({
        where: {
            chainId: event.chainId,
            txHash: event.transactionHash,
            eventIndex: event.logIndex,
            transactionIndex: event.transactionIndex,
        },
        transaction: bizTransaction,
    });
    if (existing) {
        return;
    }

    const poolId = args.poolId !== undefined ? String(args.poolId).toLowerCase() : undefined;
    const redeemSlot = args.redeemSlot !== undefined ? String(args.redeemSlot) : undefined;
    const currency = args.currency !== undefined ? String(args.currency).toLowerCase() : undefined;
    const currencyBalance = args.currencyBalance !== undefined ? String(args.currencyBalance) : undefined;
    const carryAmount = args.carryAmount !== undefined ? String(args.carryAmount) : undefined;

    await BizCarryInfo.create(
        {
            chainId: event.chainId,
            poolId,
            redeemSlot,
            currencyAddress: currency,
            currencyBalance,
            carryAmount,
            txHash: event.transactionHash,
            transactionIndex: event.transactionIndex,
            eventIndex: event.logIndex,
            lastUpdated: event.blockTimestamp,
        },
        {transaction: bizTransaction},
    );

    console.log('BizCarryInfoHandler: created record for txHash ', event.transactionHash, ' eventId ', event.eventId);
}
