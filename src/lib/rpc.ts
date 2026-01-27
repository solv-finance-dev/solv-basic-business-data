import { JsonRpcProvider, Contract } from 'ethers';
import { loadJsonConfig } from './config';

interface RpcConfig {
	chain_id: number;
	rpc_node: string;
}

const providerCache = new Map<number, JsonRpcProvider>();
let rpcConfigCache: RpcConfig[] | null = null;

// 读取并缓存 RPC 配置，避免重复 IO。
function loadRpcConfig(): RpcConfig[] {
	if (rpcConfigCache) {
		return rpcConfigCache;
	}

	const config = loadJsonConfig<RpcConfig[]>('rpc.json');
	rpcConfigCache = Array.isArray(config) ? config : [];
	return rpcConfigCache;
}

// 根据链 ID 获取并缓存 JsonRpcProvider。
export function getRpcProvider(chainId: number): JsonRpcProvider {
	const cached = providerCache.get(chainId);
	if (cached) {
		return cached;
	}

	const config = loadRpcConfig();
	const matched = config.find((item) => item.chain_id === chainId);
	if (!matched || !matched.rpc_node) {
		throw new Error(`RpcConfig: missing rpc node for chainId ${chainId}.`);
	}

	const provider = new JsonRpcProvider(matched.rpc_node);
	providerCache.set(chainId, provider);
	return provider;
}

// 获取 ERC20 基础元数据（decimals/symbol）。
export async function getErc20Metadata(
	chainId: number,
	tokenAddress: string
): Promise<{ decimals: number; symbol: string }> {
	const provider = getRpcProvider(chainId);
	const erc20Abi = [
		'function decimals() view returns (uint8)',
		'function symbol() view returns (string)',
	];
	const contract = new Contract(tokenAddress, erc20Abi, provider);

	const [decimalsResult, symbolResult] = await Promise.all([
		contract.decimals(),
		contract.symbol(),
	]);
	const decimals = typeof decimalsResult === 'bigint' ? Number(decimalsResult) : Number(decimalsResult);
	const symbol = String(symbolResult);

	return { decimals, symbol };
}
