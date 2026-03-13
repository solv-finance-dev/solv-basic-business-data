import type { HandlerParam } from '../../../types/handler';
import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import {RawOptPoolOrderInfo} from "@solvprotocol/models";
import {RawOptContractInfo} from "@solvprotocol/models";
import {CurrencyInfo} from "@solvprotocol/models";
import { OptRawNavHistoryPool } from '@solvprotocol/models';
import {RawOptPoolSlotInfo} from "@solvprotocol/models";
import { createActivity } from '../ActivityHandler';

// ==================== 常量定义 ====================

const ZERO_TOKEN_ID = '0';
const ZERO_AMOUNT = '0';
const DEFAULT_DECIMALS = 18;

const TRANSACTION_TYPE_SALE = 'Sale';
const TRANSACTION_TYPE_REDEEM = 'Redeem';
const TRANSACTION_TYPE_REVOKE = 'Revoke';
const TRANSACTION_TYPE_STAKE = 'Stake';

const NAV_TYPE_INVESTMENT = 'Investment';

// ==================== 类型定义 ====================

interface PoolOrderContext {
	poolOrderInfo: RawOptPoolOrderInfo;
	contractInfo: RawOptContractInfo;
	currencyInfo: CurrencyInfo;
}

interface ActivityParams {
	tokenId: string;
	fromAddress: string;
	toAddress: string;
	amount: string;
	transactionType: string;
	nav?: string;
	slot?: string;
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
 * 获取默认的 decimal 值（10^decimals）
 */
function getDefaultDecimalValue(decimals: number): string {
	return BigInt(10 ** decimals).toString();
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
 * 获取 SubscribeNav（从 OptRawNavHistoryPool 中查找最新的投资 NAV）
 */
async function getSubscribeNav(
	chainId: number,
	poolId: string,
	timestamp: number,
	transaction: Transaction
): Promise<OptRawNavHistoryPool | null> {
	try {
		return await OptRawNavHistoryPool.findOne({
			where: {
				poolId: poolId.toLowerCase(),
				navType: NAV_TYPE_INVESTMENT,
				lastUpdated: {
					[Op.lte]: timestamp,
				},
			},
			order: [['id', 'DESC']],
			limit: 1,
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get SubscribeNav', {
			chainId,
			poolId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 通过 slot 获取 poolId（从 PoolSlotInfo 中查找）
 */
async function getPoolIdBySlot(
	chainId: number,
	contractAddress: string,
	slot: string,
	transaction: Transaction
): Promise<string | null> {
	try {
		const poolSlotInfo = await RawOptPoolSlotInfo.findOne({
			where: {
				chainId,
				contractAddress: contractAddress.toLowerCase(),
				slot,
			},
			transaction,
		});
		return poolSlotInfo?.poolId || null;
	} catch (error) {
		console.warn('ActivityHandler: Failed to get PoolIdBySlot', {
			chainId,
			contractAddress,
			slot,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

// ==================== 上下文和辅助函数 ====================

/**
 * 获取 PoolOrder 的完整上下文（PoolOrderInfo, ContractInfo, CurrencyInfo）
 */
async function getPoolOrderContext(
	chainId: number,
	poolId: string,
	currencyAddress: string,
	openFundShareAddress: string,
	transaction: Transaction
): Promise<PoolOrderContext | null> {
	const poolOrderInfo = await getPoolOrderInfo(chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare) {
		return null;
	}

	const contractInfo = await getContractInfo(chainId, openFundShareAddress, transaction);
	if (!contractInfo) {
		return null;
	}

	const currencyInfo = await getCurrencyInfo(chainId, currencyAddress, transaction);
	if (!currencyInfo) {
		return null;
	}

	return { poolOrderInfo, contractInfo, currencyInfo };
}

/**
 * 计算 NAV 值
 */
async function calculateNav(
	chainId: number,
	poolId: string,
	currencyInfo: CurrencyInfo,
	timestamp: number,
	transaction: Transaction
): Promise<string> {
	const subscribeNav = await getSubscribeNav(chainId, poolId, timestamp, transaction);
	if (subscribeNav?.nav) {
		return String(subscribeNav.nav);
	}
	return getDefaultDecimalValue(currencyInfo.decimals || DEFAULT_DECIMALS);
}

/**
 * 基于 PoolOrderContext 创建 Activity 的通用函数
 */
async function createActivityFromContext(
	event: HandlerParam['event'],
	context: PoolOrderContext,
	params: ActivityParams,
	transaction: Transaction
): Promise<void> {
	const { poolOrderInfo, contractInfo, currencyInfo } = context;

	if (!poolOrderInfo.poolId) {
		console.warn('ActivityHandler: PoolOrderInfo missing poolId', {
			eventId: event.eventId,
		});
		return;
	}

	// 计算 NAV（如果未提供）
	let nav = params.nav;
	if (nav === undefined) {
		nav = await calculateNav(
			event.chainId,
			poolOrderInfo.poolId,
			currencyInfo,
			event.blockTimestamp,
			transaction
		);
	}

	// 确定 slot（优先使用参数中的 slot，否则使用 poolOrderInfo 的 slot）
	const slot = params.slot || poolOrderInfo.openFundShareSlot || '';

	// 确定 currencyAddress（优先使用 poolOrderInfo 的 currency）
	const currencyAddress = poolOrderInfo.currency || '';

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
		currencyAddress,
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || DEFAULT_DECIMALS,
		slot,
		transactionType: params.transactionType,
		productType: contractInfo.contractType || '',
		nav: nav || ZERO_AMOUNT,
		poolId: poolOrderInfo.poolId,
		blockNumber: event.blockNumber || 0,
		transaction,
	});
}

// ==================== 事件处理函数 ====================

/**
 * 处理 CreateSubscription 事件
 */
export async function handleCreateSubscription(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const sftWrappedToken = toAddressString(extractArg(args, 'sftWrappedToken', '_sftWrappedToken'));
	const currency = toAddressString(extractArg(args, 'currency', '_currency'));
	const subscriber = toAddressString(extractArg(args, 'subscriber', '_subscriber'));
	const swtTokenAmount = toString(extractArg(args, 'swtTokenAmount', '_swtTokenAmount')) || ZERO_AMOUNT;

	if (!poolId || !sftWrappedToken || !currency || !subscriber) {
		console.warn('ActivityHandler: CreateSubscription missing required fields', {
			eventId: event.eventId,
		});
		return;
	}

	// 获取 PoolOrderInfo 以获取 openFundShare
	const poolOrderInfo = await getPoolOrderInfo(event.chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare) {
		console.warn('ActivityHandler: PoolOrderInfo not found for CreateSubscription', {
			eventId: event.eventId,
			poolId,
		});
		return;
	}

	// 获取上下文
	const context = await getPoolOrderContext(
		event.chainId,
		poolId,
		currency,
		poolOrderInfo.openFundShare,
		transaction
	);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromContext(
		event,
		context,
		{
			tokenId: ZERO_TOKEN_ID,
			fromAddress: sftWrappedToken,
			toAddress: subscriber,
			amount: swtTokenAmount,
			transactionType: TRANSACTION_TYPE_SALE,
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
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const shareId = toString(extractArg(args, 'shareId', '_shareId')) || ZERO_TOKEN_ID;
	const currency = toAddressString(extractArg(args, 'currency', '_currency'));
	const subscriber = toAddressString(extractArg(args, 'subscriber', '_subscriber'));
	const shareValue = toString(extractArg(args, 'shareValue', '_shareValue')) || ZERO_AMOUNT;

	if (!poolId || !currency || !subscriber) {
		console.warn('ActivityHandler: Subscribe missing required fields', {
			eventId: event.eventId,
		});
		return;
	}

	// 获取 PoolOrderInfo 以获取 openFundShare
	const poolOrderInfo = await getPoolOrderInfo(event.chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare) {
		console.warn('ActivityHandler: PoolOrderInfo not found for Subscribe', {
			eventId: event.eventId,
			poolId,
		});
		return;
	}

	// 获取上下文
	const context = await getPoolOrderContext(
		event.chainId,
		poolId,
		currency,
		poolOrderInfo.openFundShare,
		transaction
	);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromContext(
		event,
		context,
		{
			tokenId: shareId,
			fromAddress: poolOrderInfo.openFundShare,
			toAddress: subscriber,
			amount: shareValue,
			transactionType: TRANSACTION_TYPE_SALE,
		},
		transaction
	);
}

/**
 * 处理 CreateRedemption 事件
 */
export async function handleCreateRedemption(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const redeemer = toAddressString(extractArg(args, 'redeemer', '_redeemer'));
	const sftWrappedToken = toAddressString(extractArg(args, 'sftWrappedToken', '_sftWrappedToken'));
	const redemptionId = toString(extractArg(args, 'redemptionId', '_redemptionId')) || ZERO_TOKEN_ID;
	const redeemAmount = toString(extractArg(args, 'redeemAmount', '_redeemAmount')) || ZERO_AMOUNT;

	if (!poolId || !redeemer || !sftWrappedToken) {
		console.warn('ActivityHandler: CreateRedemption missing required fields', {
			eventId: event.eventId,
		});
		return;
	}

	// 获取 PoolOrderInfo
	const poolOrderInfo = await getPoolOrderInfo(event.chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare || !poolOrderInfo.currency) {
		console.warn('ActivityHandler: PoolOrderInfo not found for CreateRedemption', {
			eventId: event.eventId,
			poolId,
		});
		return;
	}

	// 获取上下文
	const context = await getPoolOrderContext(
		event.chainId,
		poolId,
		poolOrderInfo.currency,
		poolOrderInfo.openFundShare,
		transaction
	);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromContext(
		event,
		context,
		{
			tokenId: redemptionId,
			fromAddress: redeemer,
			toAddress: sftWrappedToken,
			amount: redeemAmount,
			transactionType: TRANSACTION_TYPE_REDEEM,
		},
		transaction
	);
}

/**
 * 处理 CancelRedemption 事件
 */
export async function handleCancelRedemption(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
	const owner = toAddressString(extractArg(args, 'owner', '_owner'));
	const sftWrappedToken = toAddressString(extractArg(args, 'sftWrappedToken', '_sftWrappedToken'));
	const redemptionId = toString(extractArg(args, 'redemptionId', '_redemptionId')) || ZERO_TOKEN_ID;
	const cancelAmount = toString(extractArg(args, 'cancelAmount', '_cancelAmount')) || ZERO_AMOUNT;

	if (!poolId || !owner || !sftWrappedToken) {
		console.warn('ActivityHandler: CancelRedemption missing required fields', {
			eventId: event.eventId,
		});
		return;
	}

	// 获取 PoolOrderInfo
	const poolOrderInfo = await getPoolOrderInfo(event.chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare || !poolOrderInfo.currency) {
		console.warn('ActivityHandler: PoolOrderInfo not found for CancelRedemption', {
			eventId: event.eventId,
			poolId,
		});
		return;
	}

	// 获取上下文
	const context = await getPoolOrderContext(
		event.chainId,
		poolId,
		poolOrderInfo.currency,
		poolOrderInfo.openFundShare,
		transaction
	);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromContext(
		event,
		context,
		{
			tokenId: redemptionId,
			fromAddress: sftWrappedToken,
			toAddress: owner,
			amount: cancelAmount,
			transactionType: TRANSACTION_TYPE_REVOKE,
		},
		transaction
	);
}

/**
 * 处理 Stake 事件
 */
export async function handleStake(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const sftWrappedToken = toAddressString(extractArg(args, 'sftWrappedToken', '_sftWrappedToken'));
	const staker = toAddressString(extractArg(args, 'staker', '_staker'));
	const sft = toAddressString(extractArg(args, 'sft', '_sft'));
	const sftSlot = toString(extractArg(args, 'sftSlot', '_sftSlot'));
	const sftId = toString(extractArg(args, 'sftId', '_sftId')) || ZERO_TOKEN_ID;
	const amount = toString(extractArg(args, 'amount', '_amount')) || ZERO_AMOUNT;

	if (!sftWrappedToken || !staker || !sft || !sftSlot) {
		console.warn('ActivityHandler: Stake missing required fields', {
			eventId: event.eventId,
		});
		return;
	}

	// 通过 slot 获取 poolId
	const poolId = await getPoolIdBySlot(event.chainId, sft, sftSlot, transaction);
	if (!poolId) {
		console.warn('ActivityHandler: PoolId not found for slot in Stake', {
			eventId: event.eventId,
			sft,
			sftSlot,
		});
		return;
	}

	// 获取 PoolOrderInfo
	const poolOrderInfo = await getPoolOrderInfo(event.chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare || !poolOrderInfo.currency) {
		console.warn('ActivityHandler: PoolOrderInfo not found for Stake', {
			eventId: event.eventId,
			poolId,
		});
		return;
	}

	// 获取上下文
	const context = await getPoolOrderContext(
		event.chainId,
		poolId,
		poolOrderInfo.currency,
		poolOrderInfo.openFundShare,
		transaction
	);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromContext(
		event,
		context,
		{
			tokenId: sftId,
			fromAddress: staker,
			toAddress: sftWrappedToken,
			amount,
			transactionType: TRANSACTION_TYPE_STAKE,
			nav: ZERO_AMOUNT,
			slot: sftSlot,
		},
		transaction
	);
}

/**
 * 处理 Unstake 事件
 */
export async function handleUnstake(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const sftWrappedToken = toAddressString(extractArg(args, 'sftWrappedToken', '_sftWrappedToken'));
	const unstaker = toAddressString(extractArg(args, 'unstaker', '_unstaker'));
	const sft = toAddressString(extractArg(args, 'sft', '_sft'));
	const sftSlot = toString(extractArg(args, 'sftSlot', '_sftSlot'));
	const sftId = toString(extractArg(args, 'sftId', '_sftId')) || ZERO_TOKEN_ID;
	const amount = toString(extractArg(args, 'amount', '_amount')) || ZERO_AMOUNT;

	if (!sftWrappedToken || !unstaker || !sft || !sftSlot) {
		console.warn('ActivityHandler: Unstake missing required fields', {
			eventId: event.eventId,
		});
		return;
	}

	// 通过 slot 获取 poolId
	const poolId = await getPoolIdBySlot(event.chainId, sft, sftSlot, transaction);
	if (!poolId) {
		console.warn('ActivityHandler: PoolId not found for slot in Unstake', {
			eventId: event.eventId,
			sft,
			sftSlot,
		});
		return;
	}

	// 获取 PoolOrderInfo
	const poolOrderInfo = await getPoolOrderInfo(event.chainId, poolId, transaction);
	if (!poolOrderInfo || !poolOrderInfo.openFundShare || !poolOrderInfo.currency) {
		console.warn('ActivityHandler: PoolOrderInfo not found for Unstake', {
			eventId: event.eventId,
			poolId,
		});
		return;
	}

	// 获取上下文
	const context = await getPoolOrderContext(
		event.chainId,
		poolId,
		poolOrderInfo.currency,
		poolOrderInfo.openFundShare,
		transaction
	);
	if (!context) {
		return;
	}

	// 创建 Activity
	await createActivityFromContext(
		event,
		context,
		{
			tokenId: sftId,
			fromAddress: sftWrappedToken,
			toAddress: unstaker,
			amount,
			transactionType: TRANSACTION_TYPE_STAKE,
			nav: ZERO_AMOUNT,
			slot: sftSlot,
		},
		transaction
	);
}
