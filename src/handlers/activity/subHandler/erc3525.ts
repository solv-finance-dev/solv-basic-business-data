import type { HandlerParam } from '../../../types/handler';
import type { Transaction } from 'sequelize';
import {RawOptErc3525TokenInfo} from "@solvprotocol/models";
import {RawOptContractInfo} from "@solvprotocol/models";
import {RawOptPoolSlotInfo} from "@solvprotocol/models";
import {RawOptRedeemSlotInfo} from "@solvprotocol/models";
import {CurrencyInfo} from "@solvprotocol/models";
import {NavRecords} from "@solvprotocol/models";
import {CarryInfo} from "@solvprotocol/models";
import {ProtocolFeeInfo} from "@solvprotocol/models";
import {SftWrappedTokenInfo} from "@solvprotocol/models";
import { getOwnerOf, getBalanceOf } from '../../../lib/rpc';
import { createActivity, type ActivityCreationParams } from '../ActivityHandler';

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
): Promise<RawOptErc3525TokenInfo | null> {
	try {
		return await RawOptErc3525TokenInfo.findOne({
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
 * 如果 token 已被 burn，直接返回 NULL_ADDRESS，不进行链上调用
 */
async function getTokenOwner(
	chainId: number,
	contractAddress: string,
	tokenId: string,
	transaction: Transaction,
	blockNumber?: number
): Promise<string> {
	// 先从数据库获取 token 信息，检查 isBurned 状态
	const tokenInfo = await getTokenInfo(chainId, contractAddress, tokenId, transaction);
	
	// 如果 token 已被标记为 burned，直接返回 NULL_ADDRESS，避免无效的链上调用
	if (tokenInfo && tokenInfo.isBurned === 1) {
		return tokenInfo.holder || NULL_ADDRESS;
	}

	// 优先从链上获取
	try {
		const owner = await getOwnerOf(chainId, contractAddress, tokenId, blockNumber);
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
	tokenInfo: RawOptErc3525TokenInfo,
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
	tokenInfo: RawOptErc3525TokenInfo,
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

	let toTokenInfo = await getTokenInfo(event.chainId, contractAddress, toTokenId, transaction);
	
	// 如果 toTokenInfo 不存在且 fromTokenId 为 0（Mint 操作），记录警告但不直接返回
	// 因为可能在同一个事务中，Transfer 事件还没处理完
	if (!toTokenInfo && fromTokenId === ZERO_TOKEN_ID) {
		console.warn('ActivityHandler: TokenInfo not found for toTokenId in TransferValue, may be created by Transfer event', {
			toTokenId,
			contractAddress,
			eventId: event.eventId,
		});
		// 尝试再次查询，可能 Transfer 事件已经创建了 tokenInfo
		toTokenInfo = await getTokenInfo(event.chainId, contractAddress, toTokenId, transaction);
	}
	
	if (!toTokenInfo) {
		console.warn('ActivityHandler: TokenInfo not found for toTokenId in TransferValue, skipping activity creation', {
			toTokenId,
			contractAddress,
			eventId: event.eventId,
		});
		return;
	}

	// 获取 owner 地址
	const fromAddress =
		fromTokenId !== ZERO_TOKEN_ID
			? await getTokenOwner(event.chainId, contractAddress, fromTokenId, transaction, event.blockNumber)
			: NULL_ADDRESS;
	const toAddress = await getTokenOwner(event.chainId, contractAddress, toTokenId, transaction, event.blockNumber);

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

	// 如果 token 已被标记为 burned，跳过处理，避免无效的链上调用
	if (tokenInfo.isBurned === 1) {
		console.warn('ActivityHandler: Token is already burned, skipping Transfer activity', {
			contractAddress,
			tokenId,
		});
		return;
	}

	// 获取合约信息
	const contractInfo = await getContractInfo(event.chainId, contractAddress, transaction);
	if (!contractInfo) {
		return;
	}

	// 获取 balance（仅在 token 未被 burn 时调用）
	let balance = '0';
	try {
		const balanceResult = await getBalanceOf(event.chainId, contractAddress, tokenId, event.blockNumber);
		// getBalanceOf 现在可能返回 null（token 无效时），需要处理
		if (balanceResult !== null) {
			balance = balanceResult;
		} else {
			// 如果链上获取失败（token 可能已被 burn），尝试从数据库获取
			if (tokenInfo?.balance) {
				balance = tokenInfo.balance;
			}
		}
	} catch (error) {
		console.warn('ActivityHandler: Failed to get balanceOf', {
			contractAddress,
			tokenId,
			error: error instanceof Error ? error.message : String(error),
		});
		// 如果链上调用失败，尝试从数据库获取
		if (tokenInfo?.balance) {
			balance = tokenInfo.balance;
		}
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
