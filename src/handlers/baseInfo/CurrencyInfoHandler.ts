import type { HandlerParam } from '../../types/handler';
import CurrencyInfo from '../../models/CurrencyInfo';
import {getErc20Metadata} from "../../services/evmService";

// 处理 OpenFundMarket 的 SetCurrency 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const { eventFunc, event, args, transaction } = param;

    if (eventFunc !== 'SetCurrency(address,bool)') {
        return;
    }

    const currency = args.currency !== undefined ? String(args.currency).toLowerCase() : '';
    if (!currency) {
        return;
    }

    const existing = await CurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            currencyAddress: currency,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    const metadata = await getErc20Metadata(event.chainId, currency);

    await CurrencyInfo.create(
        {
            chainId: event.chainId,
            currencyAddress: currency,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
        },
        { transaction },
    );

    console.log('CurrencyInfoHandler: created record for currency ', currency, ' eventId ', event.eventId);
}
