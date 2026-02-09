import type { HandlerParam } from '../../../types/handler';
import type { Transaction } from 'sequelize';
import RawOptPoolOrderInfo from '../../../models/RawOptPoolOrderInfo';
import RawOptContractInfo from '../../../models/RawOptContractInfo';
import CurrencyInfo from '../../../models/CurrencyInfo';
import { RouterContractInfo } from '@solvprotocol/models';
import { getTransactionInfo } from '../../../lib/rpc';
import { createActivity } from '../ActivityHandler';

// ==================== 常量定义 ====================

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_TOKEN_ID = '0';
const ZERO_AMOUNT = '0';
const DEFAULT_DECIMALS = 18;

const TRANSACTION_TYPE_CREATE_POOL = 'CreatePool';
const TRANSACTION_TYPE_UPDATE_FUNDRAISING_END_TIME = 'UpdateFundraisingEndTime';
const TRANSACTION_TYPE_SALE = 'Sale';
const TRANSACTION_TYPE_REDEEM = 'Redeem';
const TRANSACTION_TYPE_REVOKE = 'Revoke';
const TRANSACTION_TYPE_CLOSE_REDEEM_SLOT = 'CloseRedeemSlot';


// ==================== 类型定义 ====================

interface PoolInfo {
	vault?: unknown;
	currency?: unknown;
	navOracle?: unknown;
	valueDate?: unknown;
	permissionless?: boolean;
	fundraisingAmount?: unknown;
	subscribeLimitInfo?: {
		hardCap?: unknown;
		subscribeMin?: unknown;
		subscribeMax?: unknown;
		fundraisingStartTime?: unknown;
		fundraisingEndTime?: unknown;
	};
	poolSFTInfo?: {
		openFundShare?: unknown;
		openFundRedemption?: unknown;
		openFundShareSlot?: unknown;
		latestRedeemSlot?: unknown;
	};
	poolFeeInfo?: {
		carryRate?: unknown;
		carryCollector?: unknown;
		latestProtocolFeeSettleTime?: unknown;
	};
	managerInfo?: {
		poolManager?: unknown;
		subscribeNavManager?: unknown;
		redeemNavManager?: unknown;
	};
}

interface PoolOrderContext {
	poolOrderInfo: RawOptPoolOrderInfo;
	contractInfo: RawOptContractInfo;
	currencyInfo: CurrencyInfo;
}

// ==================== 工具函数 ====================

/**
 * 安全转换为字符串
 */
function toString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return String(value);
}

/**
 * 安全转换为地址字符串（转小写）
 */
function toAddressString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return String(value).toLowerCase();
}

/**
 * 从事件参数中提取值（支持多种命名方式）
 */
function extractArg(args: HandlerParam['args'], ...keys: string[]): unknown {
	for (const key of keys) {
		if (args[key] !== undefined) {
			return args[key];
		}
	}
	return undefined;
}

/**
 * 根据 chainId 获取 router 合约地址列表
 */
async function getRouterContractAddresses(
	chainId: number,
	transaction: Transaction
): Promise<string[]> {
	try {
		const routerContracts = await RouterContractInfo.findAll({
			where: {
				chainId,
			},
			transaction,
		});
		return routerContracts
			.map((contract) => contract.contractAddress)
			.filter((address): address is string => address !== undefined && address !== null)
			.map((address) => address.toLowerCase());
	} catch (error) {
		console.warn('ActivityHandler: Failed to get router contract addresses', {
			chainId,
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * 检查地址是否为 router 合约
 */
async function isRouterAddress(
	chainId: number,
	address: string,
	transaction: Transaction
): Promise<boolean> {
	const routerAddresses = await getRouterContractAddresses(chainId, transaction);
	return routerAddresses.includes(address.toLowerCase());
}

// ==================== 数据访问层 ====================

/**
 * 获取 PoolOrderInfo
 */
async function getPoolOrderInfo(
	chainId: number,
	poolId: string,
	transaction: Transaction
): Promise<RawOptPoolOrderInfo | null> {
	try {
		return await RawOptPoolOrderInfo.findOne({
			where: {
				chainId,
				poolId: poolId.toLowerCase(),
			},
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get PoolOrderInfo', {
			chainId,
			poolId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 获取 ContractInfo
 */
async function getContractInfo(
	chainId: number,
	contractAddress: string,
	transaction: Transaction
): Promise<RawOptContractInfo | null> {
	try {
		return await RawOptContractInfo.findOne({
			where: {
				chainId,
				contractAddress: contractAddress.toLowerCase(),
			},
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get ContractInfo', {
			chainId,
			contractAddress,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 获取 CurrencyInfo
 */
async function getCurrencyInfo(
	chainId: number,
	currencyAddress: string,
	transaction: Transaction
): Promise<CurrencyInfo | null> {
	try {
		return await CurrencyInfo.findOne({
			where: {
				chainId,
				currencyAddress: currencyAddress.toLowerCase(),
			},
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get CurrencyInfo', {
			chainId,
			currencyAddress,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 获取交易的发起者地址（msgSender）
 */
async function getTransactionSender(
	chainId: number,
	txHash: string
): Promise<string> {
	try {
		const txInfo = await getTransactionInfo(chainId, txHash);
		return txInfo?.from || NULL_ADDRESS;
	} catch (error) {
		console.warn('ActivityHandler: Failed to get transaction sender', {
			txHash,
			error: error instanceof Error ? error.message : String(error),
		});
		return NULL_ADDRESS;
	}
}

/**
 * 获取 PoolOrder 的完整上下文信息（PoolOrderInfo、ContractInfo、CurrencyInfo）
 */
async function getPoolOrderContext(
	chainId: number,
	poolId: string,
	transaction: Transaction
): Promise<PoolOrderContext | null> {
	const poolOrderInfo = await getPoolOrderInfo(chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare) {
		return null;
	}

	const contractInfo = await getContractInfo(chainId, poolOrderInfo.openFundShare, transaction);
	if (!contractInfo) {
		return null;
	}

	const currencyInfo = await getCurrencyInfo(chainId, poolOrderInfo.currency || '', transaction);
	if (!currencyInfo) {
		return null;
	}

	return {
		poolOrderInfo,
		contractInfo,
		currencyInfo,
	};
}

// ==================== Activity 创建相关函数 ====================

/**
 * 基于 PoolOrderInfo 创建 Activity 的通用函数
 */
async function createActivityFromPoolOrder(
	event: HandlerParam['event'],
	poolOrderContext: PoolOrderContext,
	params: {
		tokenId: string;
		fromAddress: string;
		toAddress: string;
		amount: string;
		transactionType: string;
		nav?: string;
	},
	transaction: Transaction
): Promise<void> {
	const { poolOrderInfo, contractInfo, currencyInfo } = poolOrderContext;

	// 确保 poolId 存在（在 getPoolOrderContext 中已验证，但为了类型安全再次检查）
	if (!poolOrderInfo.poolId) {
		console.warn('ActivityHandler: PoolOrderInfo missing poolId', {
			eventId: event.eventId,
		});
		return;
	}

	await createActivity({
		chainId: event.chainId,
		contractAddress: event.contractAddress.toLowerCase(),
		tokenId: params.tokenId,
		txHash: event.transactionHash,
		timestamp: event.blockTimestamp,
		transactionIndex: event.transactionIndex || 0,
		eventIndex: event.logIndex || 0,
		fromAddress: params.fromAddress,
		toAddress: params.toAddress,
		amount: params.amount,
		decimals: contractInfo.decimals || DEFAULT_DECIMALS,
		currencyAddress: poolOrderInfo.currency || '',
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || DEFAULT_DECIMALS,
		slot: poolOrderInfo.openFundShareSlot || '',
		transactionType: params.transactionType,
		productType: contractInfo.contractType || '',
		nav: params.nav || ZERO_AMOUNT,
		poolId: poolOrderInfo.poolId,
		blockNumber: event.blockNumber || 0,
		transaction,
	});
}

/**
 * 从 poolInfo 中提取关键字段
 */
function extractPoolInfoFields(poolInfo: PoolInfo): {
	openFundShare?: string;
	openFundShareSlot?: string;
	poolManager?: string;
	hardCap?: string;
} {
	const poolSFTInfo = poolInfo.poolSFTInfo;
	const managerInfo = poolInfo.managerInfo;
	const subscribeLimitInfo = poolInfo.subscribeLimitInfo;

	return {
		openFundShare: toAddressString(poolSFTInfo?.openFundShare),
		openFundShareSlot: toString(poolSFTInfo?.openFundShareSlot),
		poolManager: toAddressString(managerInfo?.poolManager),
		hardCap: toString(subscribeLimitInfo?.hardCap) || ZERO_AMOUNT,
	};
}

// ==================== 事件处理函数 ====================

/**
 * 处理 CreatePool 事件
 */
export async function handleCreatePool(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const currency = toAddressString(extractArg(args, 'currency', '_currency'));
	const sft = toAddressString(extractArg(args, 'sft', '_sft'));
	const poolInfo = extractArg(args, 'poolInfo_', 'poolInfo') as PoolInfo | undefined;

	// 验证必需参数
	if (!poolId || !currency || !sft || !poolInfo) {
		console.warn('ActivityHandler: CreatePool missing required fields', {
			eventId: event.eventId,
			hasPoolId: !!poolId,
			hasCurrency: !!currency,
			hasSft: !!sft,
			hasPoolInfo: !!poolInfo,
		});
		return;
	}

	// 提取 poolInfo 中的字段
	const { openFundShare, openFundShareSlot, poolManager, hardCap } = extractPoolInfoFields(poolInfo);

	if (!openFundShare || !openFundShareSlot || !poolManager) {
		console.warn('ActivityHandler: CreatePool missing poolInfo fields', {
			eventId: event.eventId,
			hasOpenFundShare: !!openFundShare,
			hasOpenFundShareSlot: !!openFundShareSlot,
			hasPoolManager: !!poolManager,
		});
		return;
	}

	// 确保 hardCap 有值
	const hardCapValue = hardCap || ZERO_AMOUNT;

	// 获取 ContractInfo 和 CurrencyInfo
	const contractInfo = await getContractInfo(event.chainId, openFundShare, transaction);
	if (!contractInfo) {
		return;
	}

	const currencyInfo = await getCurrencyInfo(event.chainId, currency, transaction);
	if (!currencyInfo) {
		return;
	}

	// 获取 PoolOrderInfo 以获取 highWatermark（如果已存在）
	let nav = ZERO_AMOUNT;
	const poolOrderInfo = await getPoolOrderInfo(event.chainId, poolId, transaction);
	if (poolOrderInfo?.highWatermark) {
		nav = String(poolOrderInfo.highWatermark);
	}

	// 创建 Activity
	await createActivity({
		chainId: event.chainId,
		contractAddress,
		tokenId: ZERO_TOKEN_ID,
		txHash: event.transactionHash,
		timestamp: event.blockTimestamp,
		transactionIndex: event.transactionIndex || 0,
		eventIndex: event.logIndex || 0,
		fromAddress: poolManager,
		toAddress: sft,
		amount: hardCapValue,
		decimals: contractInfo.decimals || DEFAULT_DECIMALS,
		currencyAddress: currency,
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || DEFAULT_DECIMALS,
		slot: openFundShareSlot,
		transactionType: TRANSACTION_TYPE_CREATE_POOL,
		productType: contractInfo.contractType || '',
		nav,
		poolId,
		blockNumber: event.blockNumber || 0,
		transaction,
	});
}

/**
 * 处理 UpdateFundraisingEndTime 事件
 */
export async function handleUpdateFundraisingEndTime(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();

	if (!poolId) {
		console.warn('ActivityHandler: UpdateFundraisingEndTime missing poolId', {
			eventId: event.eventId,
		});
		return;
	}

	// 获取 PoolOrder 上下文
	const context = await getPoolOrderContext(event.chainId, poolId, transaction);
	if (!context) {
		return;
	}

	// 获取交易的发起者
	const msgSender = await getTransactionSender(event.chainId, event.transactionHash);

	// 创建 Activity
	await createActivityFromPoolOrder(
		event,
		context,
		{
			tokenId: ZERO_TOKEN_ID,
			fromAddress: msgSender,
			toAddress: contractAddress,
			amount: ZERO_AMOUNT,
			transactionType: TRANSACTION_TYPE_UPDATE_FUNDRAISING_END_TIME,
			nav: ZERO_AMOUNT,
		},
		transaction
	);
}

/**
 * 处理 Subscribe 事件
 */
export async function handleSubscribe(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const buyer = toAddressString(extractArg(args, 'buyer', '_buyer'));
	const tokenId = toString(extractArg(args, 'tokenId', '_tokenId')) || ZERO_TOKEN_ID;
	const value = toString(extractArg(args, 'value', '_value')) || ZERO_AMOUNT;
	const currency = toAddressString(extractArg(args, 'currency', '_currency'));
	const nav = toString(extractArg(args, 'nav', '_nav')) || ZERO_AMOUNT;

	// 验证必需参数
	if (!poolId || !buyer || !currency) {
		console.warn('ActivityHandler: Subscribe missing required fields', {
			eventId: event.eventId,
			hasPoolId: !!poolId,
			hasBuyer: !!buyer,
			hasCurrency: !!currency,
		});
		return;
	}

	// 检查是否是 router 合约
	if (await isRouterAddress(event.chainId, buyer, transaction)) {
		return;
	}

	// 获取 PoolOrder 上下文
	const context = await getPoolOrderContext(event.chainId, poolId, transaction);
	if (!context) {
		return;
	}

	// 验证 currency 是否匹配
	if (context.poolOrderInfo.currency?.toLowerCase() !== currency.toLowerCase()) {
		console.warn('ActivityHandler: Subscribe currency mismatch', {
			eventId: event.eventId,
			poolCurrency: context.poolOrderInfo.currency,
			eventCurrency: currency,
		});
		return;
	}

	// 创建 Activity
	await createActivityFromPoolOrder(
		event,
		context,
		{
			tokenId,
			fromAddress: contractAddress,
			toAddress: buyer,
			amount: value,
			transactionType: TRANSACTION_TYPE_SALE,
			nav,
		},
		transaction
	);
}

/**
 * 处理 RequestRedeem 事件
 */
export async function handleRequestRedeem(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const owner = toAddressString(extractArg(args, 'owner', '_owner'));
	const redeemValue = toString(extractArg(args, 'redeemValue', '_redeemValue')) || ZERO_AMOUNT;
	const openFundShareId = toString(extractArg(args, 'openFundShareId', '_openFundShareId')) || ZERO_TOKEN_ID;

	// 验证必需参数
	if (!poolId || !owner) {
		console.warn('ActivityHandler: RequestRedeem missing required fields', {
			eventId: event.eventId,
			hasPoolId: !!poolId,
			hasOwner: !!owner,
		});
		return;
	}

	// 检查是否是 router 合约
	if (await isRouterAddress(event.chainId, owner, transaction)) {
		return;
	}

	// 获取 PoolOrder 上下文
	const context = await getPoolOrderContext(event.chainId, poolId, transaction);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromPoolOrder(
		event,
		context,
		{
			tokenId: openFundShareId,
			fromAddress: owner,
			toAddress: contractAddress,
			amount: redeemValue,
			transactionType: TRANSACTION_TYPE_REDEEM,
			nav: ZERO_AMOUNT,
		},
		transaction
	);
}

/**
 * 处理 RevokeRedeem 事件
 */
export async function handleRevokeRedeem(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const owner = toAddressString(extractArg(args, 'owner', '_owner'));
	const openFundRedemptionId = toString(extractArg(args, 'openFundRedemptionId', '_openFundRedemptionId')) || ZERO_TOKEN_ID;

	// 验证必需参数
	if (!poolId || !owner) {
		console.warn('ActivityHandler: RevokeRedeem missing required fields', {
			eventId: event.eventId,
			hasPoolId: !!poolId,
			hasOwner: !!owner,
		});
		return;
	}

	// 检查是否是 router 合约
	if (await isRouterAddress(event.chainId, owner, transaction)) {
		return;
	}

	// 获取 PoolOrder 上下文
	const context = await getPoolOrderContext(event.chainId, poolId, transaction);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromPoolOrder(
		event,
		context,
		{
			tokenId: openFundRedemptionId,
			fromAddress: contractAddress,
			toAddress: owner,
			amount: ZERO_AMOUNT,
			transactionType: TRANSACTION_TYPE_REVOKE,
			nav: ZERO_AMOUNT,
		},
		transaction
	);
}

/**
 * 处理 CloseRedeemSlot 事件
 */
export async function handleCloseRedeemSlot(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();

	if (!poolId) {
		console.warn('ActivityHandler: CloseRedeemSlot missing poolId', {
			eventId: event.eventId,
		});
		return;
	}

	// 获取 PoolOrder 上下文
	const context = await getPoolOrderContext(event.chainId, poolId, transaction);
	if (!context) {
		return;
	}

	// 获取交易的发起者
	const msgSender = await getTransactionSender(event.chainId, event.transactionHash);

	// 创建 Activity
	await createActivityFromPoolOrder(
		event,
		context,
		{
			tokenId: ZERO_TOKEN_ID,
			fromAddress: msgSender,
			toAddress: contractAddress,
			amount: ZERO_AMOUNT,
			transactionType: TRANSACTION_TYPE_CLOSE_REDEEM_SLOT,
			nav: ZERO_AMOUNT,
		},
		transaction
	);
}
