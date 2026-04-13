import BigNumber from 'bignumber.js';
import {getBusinessSequelize} from '../../lib/dbClient';
import {getBtcTvlFromChainlink} from '../../lib/chainlink';
import PorDataHistory from '../../models/business/PorDataHistory';

const POR_CHAIN_ID = 1; // Ethereum mainnet
const POR_CONTRACT = '0xda9258AFc797Cd64d1b6FC651051224cdAB1B25E';

/**
 * Runs hourly: reads SolvBTC PoR from Chainlink, writes to por_data_history (asset_name='SolvBTC').
 * Ported from solv-schedule-task/src/lambda/resolvers/solvbtcTransparency.ts
 */
export async function runSolvBtcPorWriter(): Promise<void> {
    await getBusinessSequelize(); // ensure DB connection is ready

    const rawAmount = await getBtcTvlFromChainlink(POR_CHAIN_ID, POR_CONTRACT);
    const amountDecimal = new BigNumber(rawAmount).dividedBy(new BigNumber(10).pow(18));

    if (!amountDecimal.gt(0) || amountDecimal.isNaN()) {
        console.warn('[SolvBtcPorWriter] invalid amount, skip write:', rawAmount);
        return;
    }

    const now = Math.floor(Date.now() / 1000);
    await PorDataHistory.create({
        assetName: 'SolvBTC',
        amount: amountDecimal.toString(),
        nav: null,
        snapshotTime: now,
    });
    console.log(`[SolvBtcPorWriter] wrote amount=${amountDecimal.toString()} @ ${now}`);
}
