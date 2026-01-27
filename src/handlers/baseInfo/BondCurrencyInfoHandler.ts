import type {HandlerParam} from '../../types/handler';
import {decodeEventParamsFromAbi} from '../../lib/abi';
import BondCurrencyInfo from '../../models/BondCurrencyInfo';

export async function handleSetCurrencyEvent(param: HandlerParam): Promise<void> {
    const {event, transaction} = param;
    const args = decodeEventParamsFromAbi('OpenFundShareDelegate.json', event);

    const address = event.contractAddress;
    const currency = String(args.currency ?? '');
    const isAllowed = args.isAllowed == 1;

    if (!currency) {
        return;
    }

    const existing = await BondCurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress: address,
            currencyAddress: currency,
        },
        transaction,
    });

    if (existing) {
        if (!isAllowed) {
            // isAllowed=0 时删除记录
            await BondCurrencyInfo.destroy({
                where: {id: existing.id},
                transaction,
            });
            return;
        }
        return;
    }

    if (!isAllowed) {
        // isAllowed=0 时不创建新记录
        return;
    }

    // 创建记录
    await BondCurrencyInfo.create(
        {
            chainId: event.chainId,
            contractAddress: address,
            currencyAddress: currency
        },
        {transaction},
    );
}

