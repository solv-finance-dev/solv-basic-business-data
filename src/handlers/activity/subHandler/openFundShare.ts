import type { HandlerParam } from '../../../types/handler';
import type { Transaction } from 'sequelize';
import RawOptActivity from '../../../models/RawOptActivity';
import OptRawErc3525TokenInfo from '../../../models/RawOptErc3525TokenInfo';
import RawOptContractInfo from '../../../models/RawOptContractInfo';
import RawOptPoolSlotInfo from '../../../models/RawOptPoolSlotInfo';
import CurrencyInfo from '../../../models/CurrencyInfo';
import { getTransactionInfo } from '../../../lib/rpc';

// ==================== 常量定义 ====================

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_TOKEN_ID = '0';
const ZERO_AMOUNT = '0';
const DEFAULT_DECIMALS = 18;

const TRANSACTION_TYPE_CLAIM = 'Claim';
const TRANSACTION_TYPE_REPAY = 'Repay';
const TRANSACTION_TYPE_SET_INTEREST_RATE = 'SetInterestRate';

// 利率计算相关常量
const INTEREST_RATE_DIVISOR = 10000; // interestRate 除以 10000
const SECONDS_PER_YEAR = 360 * 86400; // 360 天 * 86400 秒/天

// ==================== 类型定义 ====================

interface ActivityCreationParams {
	chainId: number;
	contractAddress: string;
	tokenId: string;
	txHash: string;
	timestamp: number;
	transactionIndex: number;
	eventIndex: number;
	fromAddress: string;
	toAddress: string;
	amount: string;
	decimals: number;
	currencyAddress: string;
	currencySymbol: string;
	currencyDecimals: number;
	slot: string;
	transactionType: string;
	productType: string;
	nav: string;
	poolId: string;
	blockNumber: number;
	transaction: Transaction;
}

interface SlotContext {
	poolSlotInfo: RawOptPoolSlotInfo;
	contractInfo: RawOptContractInfo;
	currencyInfo: CurrencyInfo;
	slot: string;
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
 * 安全转换为数字
 */
function toNumber(value: unknown): number | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	const num = Number(value);
	return isNaN(num) ? undefined : num;
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

/**
 * 计算 NAV 值
 * 公式：nav = (interestRate / 10000 / (360 * 86400) * seconds + 1) * 10^decimals
 * 其中 seconds = maturity - valueDate
 */
function calculateNav(
	interestRate: number,
	maturity: number,
	valueDate: number,
	decimals: number
): string {
	try {
		const seconds = maturity - valueDate;
		if (seconds < 0) {
			console.warn('ActivityHandler: Invalid time range for NAV calculation', {
				maturity,
				valueDate,
				seconds,
			});
			return getDefaultDecimalValue(decimals);
		}

		// 使用 BigInt 进行精确计算
		// nav = ((interestRate * seconds) / (10000 * SECONDS_PER_YEAR) + 1) * 10^decimals
		const interestRateBigInt = BigInt(interestRate);
		const secondsBigInt = BigInt(seconds);
		const decimalsBigInt = BigInt(10 ** decimals);
		const denominator = BigInt(INTEREST_RATE_DIVISOR * SECONDS_PER_YEAR);

		const interestPart = (interestRateBigInt * secondsBigInt) / denominator;
		const navMultiplier = interestPart + BigInt(1);
		const nav = navMultiplier * decimalsBigInt;

		return nav.toString();
	} catch (error) {
		console.warn('ActivityHandler: Failed to calculate NAV', {
			interestRate,
			maturity,
			valueDate,
			decimals,
			error: error instanceof Error ? error.message : String(error),
		});
		return getDefaultDecimalValue(decimals);
	}
}

// ==================== 数据访问层 ====================

/**
 * 获取 TokenInfo
 */
async function getTokenInfo(
	chainId: number,
	contractAddress: string,
	tokenId: string,
	transaction: Transaction
): Promise<OptRawErc3525TokenInfo | null> {
	try {
		return await OptRawErc3525TokenInfo.findOne({
			where: {
				chainId,
				contractAddress: contractAddress.toLowerCase(),
				tokenId,
			},
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get TokenInfo', {
			chainId,
			contractAddress,
			tokenId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 获取 PoolSlotInfo
 */
async function getPoolSlotInfo(
	chainId: number,
	contractAddress: string,
	slot: string,
	transaction: Transaction
): Promise<RawOptPoolSlotInfo | null> {
	try {
		return await RawOptPoolSlotInfo.findOne({
			where: {
				chainId,
				contractAddress: contractAddress.toLowerCase(),
				slot,
			},
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get PoolSlotInfo', {
			chainId,
			contractAddress,
			slot,
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
 * 获取 Slot 的完整上下文信息（PoolSlotInfo、ContractInfo、CurrencyInfo）
 */
async function getSlotContext(
	chainId: number,
	contractAddress: string,
	slot: string,
	transaction: Transaction
): Promise<SlotContext | null> {
	const poolSlotInfo = await getPoolSlotInfo(chainId, contractAddress, slot, transaction);
	if (!poolSlotInfo || !poolSlotInfo.poolId) {
		return null;
	}

	const contractInfo = await getContractInfo(chainId, contractAddress, transaction);
	if (!contractInfo) {
		return null;
	}

	const currencyInfo = await getCurrencyInfo(
		chainId,
		poolSlotInfo.currencyAddress || '',
		transaction
	);
	if (!currencyInfo) {
		return null;
	}

	return {
		poolSlotInfo,
		contractInfo,
		currencyInfo,
		slot,
	};
}

/**
 * 从 tokenId 获取 Slot 的完整上下文信息
 */
async function getSlotContextFromTokenId(
	chainId: number,
	contractAddress: string,
	tokenId: string,
	transaction: Transaction
): Promise<SlotContext | null> {
	const tokenInfo = await getTokenInfo(chainId, contractAddress, tokenId, transaction);
	if (!tokenInfo || !tokenInfo.slot) {
		return null;
	}

	return await getSlotContext(chainId, contractAddress, tokenInfo.slot, transaction);
}

/**
 * 计算 NAV（从 SlotContext 中提取参数）
 */
function calculateNavFromContext(context: SlotContext): string {
	const interestRate = context.poolSlotInfo.interestRate ?? 0;
	const maturity = context.poolSlotInfo.maturity ?? 0;
	const valueDate = context.poolSlotInfo.valueDate ?? 0;
	const decimals = context.currencyInfo.decimals || DEFAULT_DECIMALS;
	return calculateNav(interestRate, maturity, valueDate, decimals);
}

// ==================== Activity 创建相关函数 ====================

/**
 * 创建 Activity 记录
 */
async function createActivity(params: ActivityCreationParams): Promise<void> {
	try {
		await RawOptActivity.create(
			{
				chainId: params.chainId,
				contractAddress: params.contractAddress.toLowerCase(),
				tokenId: params.tokenId,
				txHash: params.txHash,
				blockTimestamp: params.timestamp,
				transactionIndex: params.transactionIndex,
				eventIndex: params.eventIndex,
				fromAddress: params.fromAddress.toLowerCase(),
				toAddress: params.toAddress.toLowerCase(),
				amount: params.amount,
				decimals: params.decimals,
				currencySymbol: params.currencySymbol,
				currencyDecimals: params.currencyDecimals,
				slot: params.slot,
				transactionType: params.transactionType,
				nav: params.nav,
				poolId: params.poolId.toLowerCase(),
				blockNumber: params.blockNumber,
				lastUpdated: params.timestamp,
				productType: params.productType,
			},
			{ transaction: params.transaction }
		);
	} catch (error) {
		console.error('ActivityHandler: Failed to create Activity', {
			chainId: params.chainId,
			contractAddress: params.contractAddress,
			tokenId: params.tokenId,
			transactionType: params.transactionType,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 基于 SlotContext 创建 Activity 的通用函数
 */
async function createActivityFromSlotContext(
	event: HandlerParam['event'],
	context: SlotContext,
	params: {
		tokenId: string;
		fromAddress: string;
		toAddress: string;
		amount: string;
		transactionType: string;
		nav?: string;
		decimals?: number;
	},
	transaction: Transaction
): Promise<void> {
	const { poolSlotInfo, contractInfo, currencyInfo, slot } = context;

	// 如果没有提供 nav，则计算 nav
	const nav = params.nav ?? calculateNavFromContext(context);

	// 如果没有提供 decimals，则使用 contractInfo.decimals（SetInterestRate 使用 0）
	const decimals = params.decimals !== undefined ? params.decimals : (contractInfo.decimals || DEFAULT_DECIMALS);

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
		decimals,
		currencyAddress: poolSlotInfo.currencyAddress || '',
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || DEFAULT_DECIMALS,
		slot,
		transactionType: params.transactionType,
		productType: contractInfo.contractType || '',
		nav,
		poolId: poolSlotInfo.poolId,
		blockNumber: event.blockNumber || 0,
		transaction,
	});
}

// ==================== 事件处理函数 ====================

/**
 * 处理 Claim 事件
 */
export async function handleClaim(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const to = toAddressString(extractArg(args, 'to', '_to'));
	const tokenId = toString(extractArg(args, 'tokenId', '_tokenId')) || ZERO_TOKEN_ID;
	const claimValue = toString(extractArg(args, 'claimValue', '_claimValue')) || ZERO_AMOUNT;

	if (!to) {
		console.warn('ActivityHandler: Claim missing required fields', {
			eventId: event.eventId,
			hasTo: !!to,
		});
		return;
	}

	// 获取 Slot 上下文
	const context = await getSlotContextFromTokenId(
		event.chainId,
		contractAddress,
		tokenId,
		transaction
	);
	if (!context) {
		console.warn('ActivityHandler: Slot context not found for Claim', {
			eventId: event.eventId,
			tokenId,
		});
		return;
	}

	// 创建 Activity
	await createActivityFromSlotContext(
		event,
		context,
		{
			tokenId,
			fromAddress: contractAddress,
			toAddress: to,
			amount: claimValue,
			transactionType: TRANSACTION_TYPE_CLAIM,
		},
		transaction
	);
}

/**
 * 处理 Repay 事件
 */
export async function handleRepay(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const slot = toString(extractArg(args, 'slot', '_slot'));
	const payer = toAddressString(extractArg(args, 'payer', '_payer'));
	const repayCurrencyAmount = toString(extractArg(args, 'repayCurrencyAmount', '_repayCurrencyAmount')) || ZERO_AMOUNT;

	if (!slot || !payer) {
		console.warn('ActivityHandler: Repay missing required fields', {
			eventId: event.eventId,
			hasSlot: !!slot,
			hasPayer: !!payer,
		});
		return;
	}

	// 获取 Slot 上下文
	const context = await getSlotContext(event.chainId, contractAddress, slot, transaction);
	if (!context) {
		console.warn('ActivityHandler: Slot context not found for Repay', {
			eventId: event.eventId,
			slot,
		});
		return;
	}

	// 创建 Activity
	await createActivityFromSlotContext(
		event,
		context,
		{
			tokenId: ZERO_TOKEN_ID,
			fromAddress: payer,
			toAddress: contractAddress,
			amount: repayCurrencyAmount,
			transactionType: TRANSACTION_TYPE_REPAY,
		},
		transaction
	);
}

/**
 * 处理 SetInterestRate 事件
 * 注意：只更新 Activity 数据，不更新 PoolSlotInfo
 */
export async function handleSetInterestRate(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const slot = toString(extractArg(args, 'slot', '_slot'));
	const interestRate = toNumber(extractArg(args, 'interestRate', '_interestRate'));

	if (!slot || interestRate === undefined) {
		console.warn('ActivityHandler: SetInterestRate missing required fields', {
			eventId: event.eventId,
			hasSlot: !!slot,
			hasInterestRate: interestRate !== undefined,
		});
		return;
	}

	// 获取 Slot 上下文
	const context = await getSlotContext(event.chainId, contractAddress, slot, transaction);
	if (!context) {
		console.warn('ActivityHandler: Slot context not found for SetInterestRate', {
			eventId: event.eventId,
			slot,
		});
		return;
	}

	// 获取交易的发起者
	const msgSender = await getTransactionSender(event.chainId, event.transactionHash);

	// 创建 Activity（使用 ZERO_AMOUNT 和 ZERO_AMOUNT 作为 nav，decimals 为 0）
	await createActivityFromSlotContext(
		event,
		context,
		{
			tokenId: ZERO_TOKEN_ID,
			fromAddress: msgSender,
			toAddress: contractAddress,
			amount: ZERO_AMOUNT,
			transactionType: TRANSACTION_TYPE_SET_INTEREST_RATE,
			nav: ZERO_AMOUNT,
			decimals: 0,
		},
		transaction
	);
}
