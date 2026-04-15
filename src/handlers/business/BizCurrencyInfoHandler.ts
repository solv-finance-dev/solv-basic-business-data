import {getErc20Metadata} from '../../services/evmService';
import {isStablecoin} from '../../lib/utils';
import {getBusinessSequelize} from '../../lib/dbClient';
import type {HandlerParam} from '../../types/handler';
import BizCurrencyInfo from '../../models/business/BizCurrencyInfo';

export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {eventFunc, event, args} = param;

    if (eventFunc !== 'SetCurrency(address,bool)') {
        return;
    }

    await getBusinessSequelize();

    const currency = args.currency !== undefined ? String(args.currency).toLowerCase() : '';
    if (!currency) {
        console.warn('BizCurrencyInfoHandler: missing currency', {
            eventId: event.eventId,
        });
        return;
    }

    const existing = await BizCurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            currencyAddress: currency,
        },
    });
    if (existing) {
        return;
    }

    const metadata = await getErc20Metadata(event.chainId, currency);

    await BizCurrencyInfo.create({
        chainId: event.chainId,
        currencyAddress: currency,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        isStablecoin: isStablecoin(metadata.symbol),
    });

    console.log('BizCurrencyInfoHandler: created record for currency ', currency, ' eventId ', event.eventId);
}
