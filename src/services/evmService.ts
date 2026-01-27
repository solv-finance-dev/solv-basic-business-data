import AWS from 'aws-sdk';
import { loadJsonConfig } from '../lib/config';
import {getEnv} from '../lib/utils';
import { EventEvm } from '../types/event';
import type {ChainConfig, EvmConfigFile} from '../types/config';

const DEFAULT_BLOCK_LIMIT = 5;
let lambdaClient: AWS.Lambda | null = null;

export function getChainConfigs(): ChainConfig[] {
	const config = loadEvmConfig();
	return config.chains.map((chain) => normalizeChainConfig(chain));
}

function loadEvmConfig(): EvmConfigFile {
	try {
		const env = getEnv();
		const config = loadJsonConfig<EvmConfigFile>(`evm.${env}.json`);
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

export async function fetchChainEvents(
	chainId: number,
	beginBlockNumber: number,
	blockLimit?: number
): Promise<EventEvm[]> {
	if (!Number.isFinite(chainId) || !Number.isFinite(beginBlockNumber)) {
		console.error('EvmService: Invalid chain inputs.', {chainId, beginBlockNumber});
		return [];
	}

	const effectiveBlockLimit = blockLimit ?? DEFAULT_BLOCK_LIMIT;
	if (!Number.isFinite(effectiveBlockLimit) || effectiveBlockLimit <= 0) {
		console.error('EvmService: Invalid blockLimit.', {chainId, beginBlockNumber, blockLimit});
		return [];
	}

	const payload = {
		chainId,
		beginBlockNumber,
		blockLimit: effectiveBlockLimit,
	};

	try {
		const response = await getLambdaClient()
			.invoke({
				FunctionName: `${process.env.CONFIG_ENV}-infra-basic-event-evm-list-handler`,
				Payload: JSON.stringify(payload),
			})
			.promise();

		return parseLambdaPayload(response.Payload);
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
