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
): Promise<string | null> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function slotOf(uint256 tokenId) view returns (uint256)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	try {
		const slot = await contract.slotOf(tokenId);
		return String(slot);
	} catch (error) {
		// 如果 token 不存在或无效（可能已被 burn），返回 null 而不是抛出异常
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (errorMessage.includes('invalid token ID') || errorMessage.includes('token ID')) {
			// 不记录警告，因为这是正常情况（token 可能已被 burn），调用方会从数据库查找
			return null;
		}
		// 其他错误继续抛出
		throw error;
	}
}

// 通过 tokenId 从链上获取 slot（使用 slotByIndex 方法）
export async function getSlotByIndex(
	chainId: number,
	contractAddress: string,
	tokenId: string
): Promise<string> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function slotByIndex(uint256 tokenId) view returns (uint256)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	try {
		const slot = await contract.slotByIndex(tokenId);
		return String(slot);
	} catch (error) {
		console.error('Rpc: Failed to get slotByIndex', {
			chainId,
			contractAddress,
			tokenId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

// 获取 ERC3525 token 的 owner
export async function getOwnerOf(
	chainId: number,
	contractAddress: string,
	tokenId: string
): Promise<string | null> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function ownerOf(uint256 tokenId) view returns (address)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	try {
		const owner = await contract.ownerOf(tokenId);
		return String(owner);
	} catch (error) {
		// 如果 token 不存在或无效（可能已被 burn），返回 null 而不是抛出异常
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (errorMessage.includes('invalid token ID') || errorMessage.includes('token ID')) {
			// 不记录警告，因为这是正常情况（token 可能已被 burn），调用方会从数据库查找
			return null;
		}
		// 其他错误继续抛出
		throw error;
	}
}

// 获取 ERC3525 token 的 balance
export async function getBalanceOf(
	chainId: number,
	contractAddress: string,
	tokenId: string
): Promise<string> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function balanceOf(uint256 tokenId) view returns (uint256)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	try {
		const balance = await contract.balanceOf(tokenId);
		return String(balance);
	} catch (error) {
		console.error('Rpc: Failed to get balanceOf', {
			chainId,
			contractAddress,
			tokenId,
			error: error instanceof Error ? error.message : String(error),
		});
		return '0';
	}
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

// 获取 ERC3525 slot 的 slotURI
export async function getSlotURI(
	chainId: number,
	contractAddress: string,
	slot: string
): Promise<string> {
	const provider = getRpcProvider(chainId);
	const erc3525Abi = [
		'function slotURI(uint256 slot) view returns (string)',
	];
	const contract = new Contract(contractAddress, erc3525Abi, provider);
	try {
		const slotURI = await contract.slotURI(slot);
		return String(slotURI);
	} catch (error) {
		// 如果调用失败，返回空字符串
		return '';
	}
}

/**
 * 交易基本信息接口
 */
export interface TransactionInfo {
	from: string | null;           // 发起交易的地址（小写）
	to: string | null;             // 接收交易的地址（小写）
	value: string;                 // 交易金额（wei，字符串格式）
	gasPrice: bigint | null;       // Gas 价格
	gasLimit: bigint | null;       // Gas 限制
	nonce: number | null;          // 交易 nonce
	data: string;                  // 交易数据
	chainId: bigint | null;        // 链 ID
	hash: string;                   // 交易哈希
	blockNumber: number | null;    // 区块号
	blockHash: string | null;      // 区块哈希
	transactionIndex: number | null; // 交易索引
}

/**
 * 通过交易哈希获取交易的基本信息
 * @param chainId 链 ID
 * @param txHash 交易哈希
 * @returns 交易基本信息，如果获取失败返回 null
 */
export async function getTransactionInfo(
	chainId: number,
	txHash: string
): Promise<TransactionInfo | null> {
	const provider = getRpcProvider(chainId);
	try {
		const tx = await provider.getTransaction(txHash);
		if (!tx) {
			console.log('Rpc: Transaction not found', { chainId, txHash });
			return null;
		}

		return {
			from: tx.from ? tx.from.toLowerCase() : null,
			to: tx.to ? tx.to.toLowerCase() : null,
			value: tx.value.toString(),
			gasPrice: tx.gasPrice || null,
			gasLimit: tx.gasLimit || null,
			nonce: tx.nonce,
			data: tx.data,
			chainId: tx.chainId || null,
			hash: tx.hash,
			blockNumber: tx.blockNumber ? Number(tx.blockNumber) : null,
			blockHash: tx.blockHash || null,
			transactionIndex: tx.index !== null ? tx.index : null,
		};
	} catch (error) {
		console.error('Rpc: Failed to get transaction info', {
			chainId,
			txHash,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}