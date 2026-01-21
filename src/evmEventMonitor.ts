import { fetchAllEvent } from './services/evmService';
import { initHandlersConfig, routerEvent } from './services/monitorService';

// 轮询上游服务的默认间隔。
const DEFAULT_INTERVAL_MS = 10000;

export async function main() {
	let running = false;
	const intervalMs = Number(process.env.MONITOR_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);

	initHandlersConfig();

	setInterval(() => {
		if (running) {
			console.warn('EVM Event Monitor: Previous cycle still running, skip.');
			return;
		}

		running = true;
		void runCycle()
			.catch((error) => {
				console.error('EVM Event Monitor: Error in main cycle:', error);
			})
			.finally(() => {
				running = false;
			});
	}, intervalMs);
}

async function runCycle(): Promise<void> {
	console.log('EVM Event Monitor: Starting new cycle...');
	const events = await fetchAllEvent();

	if (events.length) {
		await routerEvent(events);
	}

	console.log('EVM Event Monitor: Cycle completed.');
}

main().catch((e) => console.error(e));
