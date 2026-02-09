import type { HandlerParam } from '../../../types/handler';
import type { Transaction } from 'sequelize';
import RawOptActivity from '../../../models/RawOptActivity';
import OptRawErc3525TokenInfo from '../../../models/RawOptErc3525TokenInfo';
import RawOptContractInfo from '../../../models/RawOptContractInfo';
import RawOptRedeemSlotInfo from '../../../models/RawOptRedeemSlotInfo';
import CurrencyInfo from '../../../models/CurrencyInfo';
import NavRecords from '../../../models/NavRecords';

// ==================== 常量定义 ====================

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_TOKEN_ID = '0';
const ZERO_AMOUNT = '0';
const DEFAULT_DECIMALS = 18;

const TRANSACTION_TYPE_CLAIM = 'Claim';
const TRANSACTION_TYPE_REPAY = 'Repay';

const NAV_TYPE_REDEMPTION = 'Redemption';

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
 * 获取 RedeemSlotInfo
 */
async function getRedeemSlotInfo(
	chainId: number,
	contractAddress: string,
	slot: string,
	transaction: Transaction
): Promise<RawOptRedeemSlotInfo | null> {
	try {
		return await RawOptRedeemSlotInfo.findOne({
			where: {
				chainId,
				contractAddress: contractAddress.toLowerCase(),
				slot,
			},
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get RedeemSlotInfo', {
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
 * 获取 RedeemNav（从 NavRecords 中查找最新的赎回 NAV）
 */
async function getRedeemNav(
	chainId: number,
	poolId: string,
	slot: string,
	transaction: Transaction
): Promise<NavRecords | null> {
	try {
		return await NavRecords.findOne({
			where: {
				chainId,
				poolId: poolId.toLowerCase(),
				navType: NAV_TYPE_REDEMPTION,
			},
			order: [['time', 'DESC']],
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get RedeemNav', {
			chainId,
			poolId,
			slot,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
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

	// 验证必需参数
	if (!to) {
		console.warn('ActivityHandler: Claim missing required fields', {
			eventId: event.eventId,
			hasTo: !!to,
		});
		return;
	}

	// 获取 TokenInfo
	const tokenInfo = await getTokenInfo(event.chainId, contractAddress, tokenId, transaction);
	if (!tokenInfo || !tokenInfo.slot) {
		console.warn('ActivityHandler: TokenInfo not found or missing slot for Claim', {
			eventId: event.eventId,
			tokenId,
		});
		return;
	}

	// 获取 RedeemSlotInfo
	const redeemSlotInfo = await getRedeemSlotInfo(
		event.chainId,
		contractAddress,
		tokenInfo.slot,
		transaction
	);
	if (!redeemSlotInfo || !redeemSlotInfo.poolId) {
		console.warn('ActivityHandler: RedeemSlotInfo not found or missing poolId for Claim', {
			eventId: event.eventId,
			slot: tokenInfo.slot,
		});
		return;
	}

	// 获取 ContractInfo
	const contractInfo = await getContractInfo(event.chainId, contractAddress, transaction);
	if (!contractInfo) {
		return;
	}

	// 获取 CurrencyInfo
	const currencyInfo = await getCurrencyInfo(
		event.chainId,
		redeemSlotInfo.currencyAddress || '',
		transaction
	);
	if (!currencyInfo) {
		return;
	}

	// 获取 RedeemNav
	let nav = ZERO_AMOUNT;
	const redeemNav = await getRedeemNav(
		event.chainId,
		redeemSlotInfo.poolId,
		tokenInfo.slot,
		transaction
	);
	if (redeemNav?.nav) {
		nav = String(redeemNav.nav);
	} else {
		nav = getDefaultDecimalValue(currencyInfo.decimals || DEFAULT_DECIMALS);
	}

	// 创建 Activity
	await createActivity({
		chainId: event.chainId,
		contractAddress,
		tokenId,
		txHash: event.transactionHash,
		timestamp: event.blockTimestamp,
		transactionIndex: event.transactionIndex || 0,
		eventIndex: event.logIndex || 0,
		fromAddress: contractAddress,
		toAddress: to,
		amount: claimValue,
		decimals: contractInfo.decimals || DEFAULT_DECIMALS,
		currencyAddress: redeemSlotInfo.currencyAddress || '',
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || DEFAULT_DECIMALS,
		slot: tokenInfo.slot,
		transactionType: TRANSACTION_TYPE_CLAIM,
		productType: contractInfo.contractType || '',
		nav,
		poolId: redeemSlotInfo.poolId,
		blockNumber: event.blockNumber || 0,
		transaction,
	});
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

	// 验证必需参数
	if (!slot || !payer) {
		console.warn('ActivityHandler: Repay missing required fields', {
			eventId: event.eventId,
			hasSlot: !!slot,
			hasPayer: !!payer,
		});
		return;
	}

	// 获取 RedeemSlotInfo
	const redeemSlotInfo = await getRedeemSlotInfo(event.chainId, contractAddress, slot, transaction);
	if (!redeemSlotInfo || !redeemSlotInfo.poolId) {
		console.warn('ActivityHandler: RedeemSlotInfo not found or missing poolId for Repay', {
			eventId: event.eventId,
			slot,
		});
		return;
	}

	// 获取 ContractInfo
	const contractInfo = await getContractInfo(event.chainId, contractAddress, transaction);
	if (!contractInfo) {
		return;
	}

	// 获取 CurrencyInfo
	const currencyInfo = await getCurrencyInfo(
		event.chainId,
		redeemSlotInfo.currencyAddress || '',
		transaction
	);
	if (!currencyInfo) {
		return;
	}

	// 获取 nav（优先使用 redeemSlotInfo.nav，否则使用默认值）
	let nav = ZERO_AMOUNT;
	if (redeemSlotInfo.nav) {
		nav = String(redeemSlotInfo.nav);
	} else {
		nav = getDefaultDecimalValue(currencyInfo.decimals || DEFAULT_DECIMALS);
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
		fromAddress: payer,
		toAddress: contractAddress,
		amount: repayCurrencyAmount,
		decimals: contractInfo.decimals || DEFAULT_DECIMALS,
		currencyAddress: redeemSlotInfo.currencyAddress || '',
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || DEFAULT_DECIMALS,
		slot,
		transactionType: TRANSACTION_TYPE_REPAY,
		productType: contractInfo.contractType || '',
		nav,
		poolId: redeemSlotInfo.poolId,
		blockNumber: event.blockNumber || 0,
		transaction,
	});
}
