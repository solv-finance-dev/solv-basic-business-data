import BigNumber from 'bignumber.js';
import {getBusinessSequelize} from '../../../lib/dbClient';
import {getBtcTvlFromChainlink, getNavFromChainlink} from '../../../lib/chainlink';
import PorDataHistory from '../../../models/business/PorDataHistory';

interface PorWriterConfig {
    assetName: string;
    porChainId: number;
    porContract: string;
    navChainId?: number;
    navContract?: string;
    precision?: number; // undefined = full precision, 4 = toFixed(4)
}

async function runPorWriter(config: PorWriterConfig): Promise<void> {
    await getBusinessSequelize();

    const rawAmount = await getBtcTvlFromChainlink(config.porChainId, config.porContract);
    const amountBN = new BigNumber(rawAmount).dividedBy(new BigNumber(10).pow(18));

    if (!amountBN.gt(0) || amountBN.isNaN()) {
        console.warn(`[PorWriter:${config.assetName}] invalid amount, skip write:`, rawAmount);
        return;
    }

    const amount = config.precision !== undefined
        ? amountBN.toFixed(config.precision)
        : amountBN.toString();

    let nav: string | null = null;
    if (config.navChainId && config.navContract) {
        const rawNav = await getNavFromChainlink(config.navChainId, config.navContract);
        nav = new BigNumber(rawNav).dividedBy(new BigNumber(10).pow(18)).toString();
    }

    const now = Math.floor(Date.now() / 1000);
    await PorDataHistory.create({
        assetName: config.assetName,
        amount,
        nav,
        snapshotTime: now,
    });
    console.log(`[PorWriter:${config.assetName}] wrote amount=${amount}${nav ? ` nav=${nav}` : ''} @ ${now}`);
}

export const runSolvBtcPorWriter = () => runPorWriter({
    assetName: 'SolvBTC',
    porChainId: 1,
    porContract: '0xda9258AFc797Cd64d1b6FC651051224cdAB1B25E',
});

export const runXSolvBtcPorWriter = () => runPorWriter({
    assetName: 'xSolvBTC',
    porChainId: 1,
    porContract: '0x461790bDAF5aeD3df6a88cB97Dec42DD0EFA73c0',
    navChainId: 56,
    navContract: '0x601CaA447C59Dc4E25992f4057BbE828F66193C0',
    precision: 4,
});
