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
): Promise<{ decimals: number; symbol: string; name: string }> {
	const provider = getRpcProvider(chainId);
	const erc20Abi = [
		'function decimals() view returns (uint8)',
		'function symbol() view returns (string)',
		'function name() view returns (string)',
	];
	const contract = new Contract(tokenAddress, erc20Abi, provider);

	const [decimalsResult, symbolResult, nameResult] = await Promise.all([
		contract.decimals(),
		contract.symbol(),
		contract.name(),
	]);
	const decimals = typeof decimalsResult === 'bigint' ? Number(decimalsResult) : Number(decimalsResult);
	const symbol = String(symbolResult);
	const name = String(nameResult);
	return { decimals, symbol, name };
}


export async function getErc3525TokenMetadata(
	chainId: number,
	tokenAddress: string
): Promise<{ decimals: number; symbol: string; name: string; contractURI: string }> {
	const provider = getRpcProvider(chainId);
	const erc20Abi = [
		'function valueDecimals() view returns (uint8)',
		'function symbol() view returns (string)',
		'function name() view returns (string)',
		'function contractURI() view returns (string)',
	];
	const contract = new Contract(tokenAddress, erc20Abi, provider);

	const [decimalsResult, symbolResult, nameResult, contractURIResult] = await Promise.all([
		contract.valueDecimals(),
		contract.symbol(),
		contract.name(),
		contract.contractURI(),
	]);
	const decimals = typeof decimalsResult === 'bigint' ? Number(decimalsResult) : Number(decimalsResult);
	const symbol = String(symbolResult);
	const name = String(nameResult);
	const contractURI = String(contractURIResult);
	return { decimals, symbol, name, contractURI };
}


export async function getContractTypeByAddress(
	chainId: number,
	contractAddress: string
): Promise<string> {
	const provider = getRpcProvider(chainId);
	const contractAbi = [
		'function contractType() view returns (string)',
	];
	const contract = new Contract(contractAddress, contractAbi, provider);
	const contractType = await contract.contractType();
	return contractType;
}

// 获取 ERC3525 token 的 slot
export async function getSlotOf(
	chainId: number,
	contractAddress: string,
	tokenId: string
): Promise<string> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function slotOf(uint256 tokenId) view returns (uint256)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	const slot = await contract.slotOf(tokenId);
	return String(slot);
}

// 获取 ERC3525 token 的 owner
export async function getOwnerOf(
	chainId: number,
	contractAddress: string,
	tokenId: string
): Promise<string> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function ownerOf(uint256 tokenId) view returns (address)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	const owner = await contract.ownerOf(tokenId);
	return String(owner);
}

// 获取 ERC3525 token 的 tokenURI
export async function getTokenURI(
	chainId: number,
	contractAddress: string,
	tokenId: string
): Promise<string> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function tokenURI(uint256 tokenId) view returns (string)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	try {
		const tokenURI = await contract.tokenURI(tokenId);
		return String(tokenURI);
	} catch (error) {
		// 如果调用失败，返回空字符串
		return '';
	}
}