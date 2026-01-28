import type {HandlerParam} from '../../types/handler';
import BondCurrencyInfo from '../../models/BondCurrencyInfo';

export async function handleOpenFundShareDelegateEvent(param: HandlerParam): Promise<void> {
    const {event, args, transaction} = param;

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
            console.log('BondCurrencyInfoHandler: deleted record for contract ', address, ' currency ', currency, ' eventId ', event.eventId);
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
    console.log('BondCurrencyInfoHandler: created record for contract ', address, ' currency ', currency, ' eventId ', event.eventId);
}

