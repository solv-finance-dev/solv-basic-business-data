import AWS from 'aws-sdk';
import { loadJsonConfig } from '../lib/config';
import { getLastSyncedBlock, setLastSyncedBlock } from '../data/evmSyncState';
import { EventEvm } from '../types/event';

interface ChainConfig {
	chainId: number;
	startBlockNumber: number;
	blockLimit?: number;
}

interface EvmConfigFile {
	chains: ChainConfig[];
}

const DEFAULT_BLOCK_LIMIT = 5;
let lambdaClient: AWS.Lambda | null = null;

// 拉取配置内所有链的事件数据。
export async function fetchAllEvent(): Promise<EventEvm[]> {
	const config = loadEvmConfig();
	if (!config.chains.length) {
		console.warn('EvmService: No chain config found.');
		return [];
	}

	const results = await Promise.all(
		config.chains.map((chain) => fetchChainEvents(normalizeChainConfig(chain)))
	);

	return results.flat();
}

function loadEvmConfig(): EvmConfigFile {
	try {
		const config = loadJsonConfig<EvmConfigFile>('evm.json');
		return {
			chains: Array.isArray(config.chains) ? config.chains : [],
		};
	} catch (error) {
		console.error('EvmService: Failed to load evm config.', error);
		return { chains: [] };
	}
}

function normalizeChainConfig(chain: ChainConfig): ChainConfig {
	return {
		chainId: chain.chainId,
		startBlockNumber: chain.startBlockNumber,
		blockLimit: chain.blockLimit ?? DEFAULT_BLOCK_LIMIT,
	};
}

async function fetchChainEvents(chain: ChainConfig): Promise<EventEvm[]> {
	if (!Number.isFinite(chain.chainId) || !Number.isFinite(chain.startBlockNumber)) {
		console.warn('EvmService: Invalid chain config.', chain);
		return [];
	}

	const blockLimit = chain.blockLimit ?? DEFAULT_BLOCK_LIMIT;
	if (!Number.isFinite(blockLimit) || blockLimit <= 0) {
		console.warn('EvmService: Invalid blockLimit.', chain);
		return [];
	}

	const lastSyncedBlock = await getLastSyncedBlock(chain.chainId);
	const beginBlockNumber = lastSyncedBlock === null ? chain.startBlockNumber : lastSyncedBlock + 1;

	const payload = {
		chainId: chain.chainId,
		beginBlockNumber,
		blockLimit,
	};

	try {
		const response = await getLambdaClient()
			.invoke({
				FunctionName: `${process.env.CONFIG_ENV}-infra-basic-event-evm-list-handler`,
				Payload: JSON.stringify(payload),
			})
			.promise();

		const events = parseLambdaPayload(response.Payload);
		// 空结果不推进区块，避免上游未同步导致漏数据。
		if (events.length > 0) {
			const maxBlockNumber = getMaxBlockNumber(events);
			if (maxBlockNumber !== null) {
				await setLastSyncedBlock(chain.chainId, maxBlockNumber);
			}
		}

		return events;
	} catch (error) {
		console.error('EvmService: Failed to fetch chain events.', error);
		return [];
	}
}

function getLambdaClient(): AWS.Lambda {
	if (!lambdaClient) {
		lambdaClient = new AWS.Lambda({
			region: process.env.CDK_DEPLOY_REGION ?? process.env.AWS_REGION,
		});
	}

	return lambdaClient;
}

function parseLambdaPayload(payload: AWS.Lambda.Types.InvocationResponse['Payload']): EventEvm[] {
	if (!payload) {
		return [];
	}

	try {
		const raw = typeof payload === 'string' ? payload : payload.toString();
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed as EventEvm[];
		}

		if (parsed && typeof parsed === 'object' && 'body' in parsed) {
			const body = (parsed as { body?: unknown }).body;
			const data = typeof body === 'string' ? JSON.parse(body) : body;
			return Array.isArray(data) ? (data as EventEvm[]) : [];
		}
	} catch (error) {
		console.error('EvmService: Failed to parse lambda payload.', error);
	}

	return [];
}

function getMaxBlockNumber(events: EventEvm[]): number | null {
	const numbers = events.map((event) => event.blockNumber).filter((value) => Number.isFinite(value));
	if (!numbers.length) {
		return null;
	}

	return Math.max(...numbers);
}
