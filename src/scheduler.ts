import {runSolvBtcPorWriter, runXSolvBtcPorWriter} from './handlers/task/market/PorWriter';
import {handler as runChainLinkProof} from './handlers/task/config/ChainLinkProof';
import {handler as runOtherProof} from './handlers/task/config/OtherProof';
// Interface #3: import { runYieldPoolSnapshotWriter } from './services/market/YieldPoolSnapshotWriter';
// Interface #9: import { runBtcPlusApyHistoryWriter } from './services/market/BtcPlusApyHistoryWriter';

const HOUR_MS = parseInt(process.env.MARKET_POR_INTERVAL_MS ?? `${60 * 60 * 1000}`, 10);
// Interface #3: const FIVE_MIN_MS = parseInt(process.env.MARKET_YIELD_INTERVAL_MS ?? `${5 * 60 * 1000}`, 10);
// Interface #9: const HALF_HOUR_MS = parseInt(process.env.MARKET_BTCPLUS_INTERVAL_MS ?? `${30 * 60 * 1000}`, 10);

function periodicTask(name: string, fn: () => Promise<void>, intervalMs: number) {
    let running = false;
    const tick = () => {
        if (running) {
            console.info(`[${name}] previous cycle still running, skip`);
            return;
        }
        running = true;
        fn()
            .catch((err) => console.error(`[${name}] error:`, err))
            .finally(() => {
                running = false;
            });
    };
    tick(); // 启动即跑一次
    setInterval(tick, intervalMs);
}

export async function main() {
    console.log('[MarketScheduler] starting');

    periodicTask('SolvBtcPorWriter', runSolvBtcPorWriter, HOUR_MS);
    periodicTask('XSolvBtcPorWriter', runXSolvBtcPorWriter, HOUR_MS);
    periodicTask('ChainLinkProof', async () => runChainLinkProof({}), HOUR_MS);
    periodicTask('OtherProof', async () => runOtherProof({}), HOUR_MS);
    // Interface #3: periodicTask('YieldPoolSnapshotWriter', runYieldPoolSnapshotWriter, FIVE_MIN_MS);
    // Interface #9: periodicTask('BtcPlusApyHistoryWriter', runBtcPlusApyHistoryWriter, HALF_HOUR_MS);

    console.log('[MarketScheduler] all 4 periodic tasks scheduled');
}

if (require.main === module) {
    main().catch((err) => {
        console.error('[MarketScheduler] fatal:', err);
        process.exit(1);
    });
}
