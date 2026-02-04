import type { HandlerParam } from '../../../types/handler';
import type { Transaction } from 'sequelize';
import RawOptActivity from '../../../models/RawOptActivity';
import OptRawErc3525TokenInfo from '../../../models/RawOptErc3525TokenInfo';
import RawOptContractInfo from '../../../models/RawOptContractInfo';
import RawOptPoolSlotInfo from '../../../models/RawOptPoolSlotInfo';
import RawOptRedeemSlotInfo from '../../../models/RawOptRedeemSlotInfo';
import CurrencyInfo from '../../../models/CurrencyInfo';
import NavRecords from '../../../models/NavRecords';
import CarryInfo from '../../../models/CarryInfo';
import ProtocolFeeInfo from '../../../models/ProtocolFeeInfo';
import SftWrappedTokenInfo from '../../../models/SftWrappedTokenInfo';
import { getOwnerOf, getBalanceOf } from '../../../lib/rpc';

// ==================== 常量定义 ====================

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dead';
const ZERO_TOKEN_ID = '0';
const TRANSACTION_TYPE_TRANSFER = 'Transfer';
const TRANSACTION_TYPE_SETTLE_CARRY = 'SettleCarry';
const TRANSACTION_TYPE_SETTLE_PROTOCOL_FEE = 'SettleProtocolFee';
const CONTRACT_TYPE_OPEN_FUND_SHARES = 'Open Fund Shares';
const CONTRACT_TYPE_OPEN_FUND_REDEMPTIONS = 'Open Fund Redemptions';
const NAV_TYPE_SUBSCRIBE = '申购';

// router 合约地址列表（需要根据实际情况配置）
const ROUTER_CONTRACT_ADDRESSES: string[] = [];

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

/**
 * 检查地址是否为有效地址（非空且非死地址）
 */
function isValidAddress(address: string): boolean {
	return address !== NULL_ADDRESS && address !== DEAD_ADDRESS && address !== '';
}

/**
 * 检查地址是否为 router 合约
 */
function isRouterAddress(address: string): boolean {
	return ROUTER_CONTRACT_ADDRESSES.includes(address.toLowerCase());
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
 * 获取 SubscribeNav（从 NavRecords 中查找最新的申购 NAV）
 */
async function getSubscribeNav(
	chainId: number,
	poolId: string,
	transaction: Transaction
): Promise<NavRecords | null> {
	try {
		return await NavRecords.findOne({
			where: {
				chainId,
				poolId: poolId.toLowerCase(),
				navType: NAV_TYPE_SUBSCRIBE,
			},
			order: [['time', 'DESC']],
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
 * 获取 CarryCollectorInfo
 */
async function getCarryCollectorInfo(
	chainId: number,
	address: string,
	transaction: Transaction
): Promise<CarryInfo | null> {
	try {
		return await CarryInfo.findOne({
			where: {
				chainId,
				// 注意：CarryInfo 可能没有直接的 address 字段，需要根据实际情况调整
			},
			order: [['lastUpdated', 'DESC']],
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get CarryCollectorInfo', {
			chainId,
			address,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 获取 ProtocolFeeCollectorInfo
 */
async function getProtocolFeeCollectorInfo(
	chainId: number,
	address: string,
	transaction: Transaction
): Promise<ProtocolFeeInfo | null> {
	try {
		return await ProtocolFeeInfo.findOne({
			where: {
				chainId,
				// 注意：ProtocolFeeInfo 可能没有直接的 address 字段，需要根据实际情况调整
			},
			order: [['lastUpdated', 'DESC']],
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get ProtocolFeeCollectorInfo', {
			chainId,
			address,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 获取 SftWrappedTokenInfo
 */
async function getSftWrappedTokenInfo(
	chainId: number,
	address: string,
	timestamp: number,
	transaction: Transaction
): Promise<SftWrappedTokenInfo | null> {
	try {
		return await SftWrappedTokenInfo.findOne({
			where: {
				chainId,
				sftAddress: address.toLowerCase(),
			},
			transaction,
		});
	} catch (error) {
		console.warn('ActivityHandler: Failed to get SftWrappedTokenInfo', {
			chainId,
			address,
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
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 计算 NAV 值
 */
async function calculateNav(
	chainId: number,
	poolId: string,
	currencyDecimals: number,
	transaction: Transaction
): Promise<string> {
	const subscribeNav = await getSubscribeNav(chainId, poolId, transaction);
	if (subscribeNav?.nav) {
		return String(subscribeNav.nav);
	}
	return getDefaultDecimalValue(currencyDecimals);
}

/**
 * 获取 token 的 owner 地址（优先从链上获取，失败则从数据库获取）
 */
async function getTokenOwner(
	chainId: number,
	contractAddress: string,
	tokenId: string,
	transaction: Transaction
): Promise<string> {
	// 优先从链上获取
	try {
		const owner = await getOwnerOf(chainId, contractAddress, tokenId);
		if (owner && owner !== NULL_ADDRESS) {
			return owner;
		}
	} catch (error) {
		console.warn('ActivityHandler: Failed to get ownerOf from chain', {
			contractAddress,
			tokenId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	// 从数据库获取
	const tokenInfo = await getTokenInfo(chainId, contractAddress, tokenId, transaction);
	if (tokenInfo?.holder) {
		return tokenInfo.holder;
	}

	return NULL_ADDRESS;
}

/**
 * 检查地址是否应该被过滤（router 合约或 SFT wrapped token）
 */
async function shouldFilterAddress(
	chainId: number,
	address: string,
	timestamp: number,
	transaction: Transaction
): Promise<boolean> {
	if (isRouterAddress(address)) {
		return true;
	}

	const sftWrapped = await getSftWrappedTokenInfo(chainId, address, timestamp, transaction);
	return sftWrapped !== null;
}

/**
 * 确定交易类型（Transfer、SettleCarry 或 SettleProtocolFee）
 */
async function determineTransactionType(
	chainId: number,
	fromTokenId: string,
	toAddress: string,
	transaction: Transaction
): Promise<string> {
	// 如果 fromTokenId 为 0，可能是结算操作
	if (fromTokenId === ZERO_TOKEN_ID && isValidAddress(toAddress)) {
		// 检查是否是 CarryCollector
		const carryCollector = await getCarryCollectorInfo(chainId, toAddress, transaction);
		if (carryCollector?.lastUpdated) {
			return TRANSACTION_TYPE_SETTLE_CARRY;
		}

		// 检查是否是 ProtocolFeeCollector
		const feeCollector = await getProtocolFeeCollectorInfo(chainId, toAddress, transaction);
		if (feeCollector?.lastUpdated) {
			return TRANSACTION_TYPE_SETTLE_PROTOCOL_FEE;
		}
	}

	return TRANSACTION_TYPE_TRANSFER;
}

/**
 * 处理 Open Fund Shares 类型的 Activity 创建
 */
async function handleOpenFundSharesActivity(
	event: HandlerParam['event'],
	contractInfo: RawOptContractInfo,
	tokenInfo: OptRawErc3525TokenInfo,
	fromAddress: string,
	toAddress: string,
	amount: string,
	transactionType: string,
	transaction: Transaction
): Promise<void> {
	const poolSlotInfo = await getPoolSlotInfo(
		event.chainId,
		event.contractAddress.toLowerCase(),
		tokenInfo.slot!,
		transaction
	);
	if (!poolSlotInfo) {
		return;
	}

	const currencyInfo = await getCurrencyInfo(
		event.chainId,
		poolSlotInfo.currencyAddress || '',
		transaction
	);
	if (!currencyInfo) {
		return;
	}

	const nav = await calculateNav(
		event.chainId,
		poolSlotInfo.poolId || '',
		currencyInfo.decimals || 18,
		transaction
	);

	await createActivity({
		chainId: event.chainId,
		contractAddress: event.contractAddress.toLowerCase(),
		tokenId: tokenInfo.tokenId,
		txHash: event.transactionHash,
		timestamp: event.blockTimestamp,
		transactionIndex: event.transactionIndex || 0,
		eventIndex: event.logIndex || 0,
		fromAddress,
		toAddress,
		amount,
		decimals: contractInfo.decimals || 18,
		currencyAddress: poolSlotInfo.currencyAddress || '',
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || 18,
		slot: tokenInfo.slot!,
		transactionType,
		productType: contractInfo.contractType || '',
		nav,
		poolId: poolSlotInfo.poolId || '',
		blockNumber: event.blockNumber || 0,
		transaction,
	});
}

/**
 * 处理 Open Fund Redemptions 类型的 Activity 创建
 */
async function handleOpenFundRedemptionsActivity(
	event: HandlerParam['event'],
	contractInfo: RawOptContractInfo,
	tokenInfo: OptRawErc3525TokenInfo,
	fromAddress: string,
	toAddress: string,
	amount: string,
	transaction: Transaction
): Promise<void> {
	const redeemSlotInfo = await getRedeemSlotInfo(
		event.chainId,
		event.contractAddress.toLowerCase(),
		tokenInfo.slot!,
		transaction
	);
	if (!redeemSlotInfo) {
		return;
	}

	const currencyInfo = await getCurrencyInfo(
		event.chainId,
		redeemSlotInfo.currencyAddress || '',
		transaction
	);
	if (!currencyInfo) {
		return;
	}

	await createActivity({
		chainId: event.chainId,
		contractAddress: event.contractAddress.toLowerCase(),
		tokenId: tokenInfo.tokenId,
		txHash: event.transactionHash,
		timestamp: event.blockTimestamp,
		transactionIndex: event.transactionIndex || 0,
		eventIndex: event.logIndex || 0,
		fromAddress,
		toAddress,
		amount,
		decimals: contractInfo.decimals || 18,
		currencyAddress: redeemSlotInfo.currencyAddress || '',
		currencySymbol: currencyInfo.symbol || '',
		currencyDecimals: currencyInfo.decimals || 18,
		slot: tokenInfo.slot!,
		transactionType: TRANSACTION_TYPE_TRANSFER,
		productType: contractInfo.contractType || '',
		nav: '0',
		poolId: redeemSlotInfo.poolId || '',
		blockNumber: event.blockNumber || 0,
		transaction,
	});
}

// ==================== 事件处理函数 ====================

/**
 * 处理 TransferValue 事件
 */
export async function handleTransferValue(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const fromTokenId = toString(extractArg(args, '_fromTokenId', 'fromTokenId')) || ZERO_TOKEN_ID;
	const toTokenId = toString(extractArg(args, '_toTokenId', 'toTokenId')) || ZERO_TOKEN_ID;
	const value = toString(extractArg(args, '_value', 'value')) || '0';

	// 只处理 toTokenId 不为 0 的情况
	if (toTokenId === ZERO_TOKEN_ID) {
		return;
	}

	// 验证 token 信息是否存在
	if (fromTokenId !== ZERO_TOKEN_ID) {
		const fromTokenInfo = await getTokenInfo(event.chainId, contractAddress, fromTokenId, transaction);
		if (!fromTokenInfo) {
			return;
		}
	}

	const toTokenInfo = await getTokenInfo(event.chainId, contractAddress, toTokenId, transaction);
	if (!toTokenInfo) {
		return;
	}

	// 获取 owner 地址
	const fromAddress =
		fromTokenId !== ZERO_TOKEN_ID
			? await getTokenOwner(event.chainId, contractAddress, fromTokenId, transaction)
			: NULL_ADDRESS;
	const toAddress = await getTokenOwner(event.chainId, contractAddress, toTokenId, transaction);

	// 检查是否需要过滤
	const shouldFilterFrom = await shouldFilterAddress(
		event.chainId,
		fromAddress,
		event.blockTimestamp,
		transaction
	);
	const shouldFilterTo = await shouldFilterAddress(
		event.chainId,
		toAddress,
		event.blockTimestamp,
		transaction
	);

	if (shouldFilterFrom || shouldFilterTo) {
		return;
	}

	// 获取合约信息
	const contractInfo = await getContractInfo(event.chainId, contractAddress, transaction);
	if (!contractInfo) {
		return;
	}

	// 获取用于创建 Activity 的 tokenInfo（优先使用 fromTokenId，如果为 0 则使用 toTokenId）
	const activityTokenId = fromTokenId !== ZERO_TOKEN_ID ? fromTokenId : toTokenId;
	const activityTokenInfo = await getTokenInfo(event.chainId, contractAddress, activityTokenId, transaction);
	if (!activityTokenInfo || !activityTokenInfo.slot) {
		return;
	}

	// 确定交易类型
	let finalFromAddress = fromAddress;
	if (fromTokenId === ZERO_TOKEN_ID) {
		finalFromAddress = NULL_ADDRESS;
		if (!isValidAddress(toAddress)) {
			return;
		}
	}

	const transactionType = await determineTransactionType(
		event.chainId,
		fromTokenId,
		toAddress,
		transaction
	);

	// 根据合约类型处理
	if (contractInfo.contractType === CONTRACT_TYPE_OPEN_FUND_SHARES) {
		await handleOpenFundSharesActivity(
			event,
			contractInfo,
			activityTokenInfo,
			finalFromAddress,
			toAddress,
			value,
			transactionType,
			transaction
		);
	} else if (contractInfo.contractType === CONTRACT_TYPE_OPEN_FUND_REDEMPTIONS) {
		// Open Fund Redemptions 需要 fromTokenId 和 toTokenId 都不为 0
		if (fromTokenId !== ZERO_TOKEN_ID && toTokenId !== ZERO_TOKEN_ID) {
			await handleOpenFundRedemptionsActivity(
				event,
				contractInfo,
				activityTokenInfo,
				fromAddress,
				toAddress,
				value,
				transaction
			);
		}
	}
}

/**
 * 处理 Transfer 事件
 */
export async function handleTransfer(
	event: HandlerParam['event'],
	args: HandlerParam['args'],
	transaction: Transaction
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const tokenId = toString(extractArg(args, 'tokenId', '_tokenId')) || ZERO_TOKEN_ID;
	const from = toAddressString(extractArg(args, 'from', '_from')) || NULL_ADDRESS;
	const to = toAddressString(extractArg(args, 'to', '_to')) || NULL_ADDRESS;

	// 验证基本条件
	if (
		tokenId === ZERO_TOKEN_ID ||
		!isValidAddress(from) ||
		!isValidAddress(to) ||
		isRouterAddress(from) ||
		isRouterAddress(to)
	) {
		return;
	}

	// 验证 token 信息是否存在
	const tokenInfo = await getTokenInfo(event.chainId, contractAddress, tokenId, transaction);
	if (!tokenInfo || !tokenInfo.slot) {
		return;
	}

	// 获取合约信息
	const contractInfo = await getContractInfo(event.chainId, contractAddress, transaction);
	if (!contractInfo) {
		return;
	}

	// 获取 balance
	let balance = '0';
	try {
		balance = await getBalanceOf(event.chainId, contractAddress, tokenId);
	} catch (error) {
		console.warn('ActivityHandler: Failed to get balanceOf', {
			contractAddress,
			tokenId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	// 根据合约类型处理
	if (contractInfo.contractType === CONTRACT_TYPE_OPEN_FUND_SHARES) {
		await handleOpenFundSharesActivity(
			event,
			contractInfo,
			tokenInfo,
			from,
			to,
			balance,
			TRANSACTION_TYPE_TRANSFER,
			transaction
		);
	} else if (contractInfo.contractType === CONTRACT_TYPE_OPEN_FUND_REDEMPTIONS) {
		await handleOpenFundRedemptionsActivity(
			event,
			contractInfo,
			tokenInfo,
			from,
			to,
			balance,
			transaction
		);
	}
}
