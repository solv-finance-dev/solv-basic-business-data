import BigNumber from 'bignumber.js';
import {getBusinessSequelize} from '../../lib/dbClient';
import {getBtcTvlFromChainlink, getNavFromChainlink} from '../../lib/chainlink';
import PorDataHistory from '../../models/business/PorDataHistory';

const POR_CHAIN_ID = 1; // Ethereum mainnet
const POR_CONTRACT = '0x461790bDAF5aeD3df6a88cB97Dec42DD0EFA73c0';
const NAV_CHAIN_ID = 56; // BNB chain
const NAV_CONTRACT = '0x601CaA447C59Dc4E25992f4057BbE828F66193C0';

/**
 * Runs hourly: reads xSolvBTC PoR + NAV from Chainlink, writes to por_data_history (asset_name='xSolvBTC').
 * Ported from solv-schedule-task/src/lambda/resolvers/xsolvbtcTransparency.ts
 * Preserves toFixed(4) precision (legacy response is "1185.7222" with 4 decimals)
 */
export async function runXSolvBtcPorWriter(): Promise<void> {
    await getBusinessSequelize();

    const rawAmount = await getBtcTvlFromChainlink(POR_CHAIN_ID, POR_CONTRACT);
    const amountBN = new BigNumber(rawAmount).dividedBy(new BigNumber(10).pow(18));
    // Preserve legacy toFixed(4) precision
    const amountFixed = amountBN.toFixed(4);

    const rawNav = await getNavFromChainlink(NAV_CHAIN_ID, NAV_CONTRACT);
    const navStr = new BigNumber(rawNav).dividedBy(new BigNumber(10).pow(18)).toString();

    if (!amountBN.gt(0) || amountBN.isNaN()) {
        console.warn('[XSolvBtcPorWriter] invalid amount, skip write:', rawAmount);
        return;
    }

    const now = Math.floor(Date.now() / 1000);
    await PorDataHistory.create({
        assetName: 'xSolvBTC',
        amount: amountFixed,
        nav: navStr,
        snapshotTime: now,
    });
    console.log(`[XSolvBtcPorWriter] wrote amount=${amountFixed} nav=${navStr} @ ${now}`);
}
