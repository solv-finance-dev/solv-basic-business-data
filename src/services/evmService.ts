import AWS from 'aws-sdk';
import {loadJsonConfig} from '../lib/config';
import {getEnv} from '../lib/utils';
import {EventEvm} from '../types/eventEvm';
import type {ChainConfig, EvmConfigFile} from '../types/config';
import {getContractTypeByAddress, getErc20Metadata as getErc20MetadataFromRpc} from '../lib/rpc';
import type {TemplateAddress} from '../types/templateAddress';

const DEFAULT_BLOCK_LIMIT = 5;
let lambdaClient: AWS.Lambda | null = null;
const contractTypeCache = new Map<string, string>();
const erc20MetadataCache = new Map<string, { decimals: number; symbol: string; name: string }>();
const chainConfigCache = new Map<number, ChainConfig | undefined>();

export function getChainConfigs(): ChainConfig[] {
    const config = loadEvmConfig();
    return config.chains.map((chain) => normalizeChainConfig(chain));
}

export function getChainConfig(chainId: number): ChainConfig | undefined {
    if (chainConfigCache.has(chainId)) {
        return chainConfigCache.get(chainId);
    }

    const chain = getChainConfigs().find((item) => item.chainId === chainId);
    chainConfigCache.set(chainId, chain);
    return chain;
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
        return {chains: []};
    }
}

function normalizeChainConfig(chain: ChainConfig): ChainConfig {
    return {
        chainId: chain.chainId,
        startBlockNumber: chain.startBlockNumber,
        blockLimit: chain.blockLimit ?? DEFAULT_BLOCK_LIMIT,
        config: chain.config,
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

export async function getEventByIds(eventIds: number[]): Promise<EventEvm[]> {
    if (!Array.isArray(eventIds) || !eventIds.length) {
        return [];
    }

    const ids = eventIds.filter((id) => Number.isFinite(id));
    if (!ids.length) {
        return [];
    }

    try {
        const response = await getLambdaClient()
            .invoke({
                FunctionName: `${process.env.CONFIG_ENV}-infra-basic-event-evm-get-by-ids-handler`,
                Payload: JSON.stringify(ids),
            })
            .promise();

        return parseLambdaPayload(response.Payload);
    } catch (error) {
        console.error('EvmService: Failed to fetch events by ids.', error);
        return [];
    }
}

export async function fetchTemplateAddresses(chainId: number): Promise<TemplateAddress[]> {
    if (!Number.isFinite(chainId)) {
        console.error('EvmService: Invalid chainId for template addresses.', {chainId});
        return [];
    }

    const payload = {chainId};

    try {
        const response = await getLambdaClient()
            .invoke({
                FunctionName: `${process.env.CONFIG_ENV}-infra-basic-template-address-getByChainId-handler`,
                Payload: JSON.stringify(payload),
            })
            .promise();

        return parseTemplateAddressPayload(response.Payload);
    } catch (error) {
        console.error('EvmService: Failed to fetch template addresses.', error);
        return [];
    }
}

export async function getTemplateAddressesMap(chainId: number): Promise<Record<string, string[]>> {
    const templateAddresses = await fetchTemplateAddresses(chainId);
    const map: Record<string, string[]> = {};

    for (const item of templateAddresses) {
        const signature = String(item.eventSignature ?? '').toLowerCase();
        const address = String(item.address ?? '').toLowerCase();
        if (!signature || !address) {
            continue;
        }
        if (!map[signature]) {
            map[signature] = [];
        }
        if (!map[signature].includes(address)) {
            map[signature].push(address);
        }
    }

    return map;
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

function parseTemplateAddressPayload(payload: AWS.Lambda.Types.InvocationResponse['Payload']): TemplateAddress[] {
    if (!payload) {
        return [];
    }

    try {
        const raw = typeof payload === 'string' ? payload : payload.toString();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed as TemplateAddress[];
        }

        if (parsed && typeof parsed === 'object' && 'body' in parsed) {
            const body = (parsed as { body?: unknown }).body;
            const data = typeof body === 'string' ? JSON.parse(body) : body;
            return Array.isArray(data) ? (data as TemplateAddress[]) : [];
        }
    } catch (error) {
        console.error('EvmService: Failed to parse template payload.', error);
    }

    return [];
}

// 带缓存的合约类型获取
export async function getContractType(chainId: number, contractAddress: string): Promise<string> {
    const key = `${chainId}:${contractAddress.toLowerCase()}`;
    const cached = contractTypeCache.get(key);
    if (cached) {
        return cached;
    }

    const contractType = await getContractTypeByAddress(chainId, contractAddress);
    contractTypeCache.set(key, contractType);
    return contractType;
}

// 带缓存的 ERC20 元数据获取
export async function getErc20Metadata(chainId: number, tokenAddress: string): Promise<{
    decimals: number;
    symbol: string;
    name: string
}> {
    const key = `${chainId}:${tokenAddress.toLowerCase()}`;
    const cached = erc20MetadataCache.get(key);
    if (cached) {
        return cached;
    }

    const metadata = await getErc20MetadataFromRpc(chainId, tokenAddress);
    erc20MetadataCache.set(key, metadata);
    return metadata;
}


