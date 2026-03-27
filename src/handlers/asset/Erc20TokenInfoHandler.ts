import type { HandlerParam } from '../../types/handler';
import { SftWrappedTokenInfo, WrappedAssetInfo } from "@solvprotocol/models";
import { RawOptErc20AssetInfo } from "@solvprotocol/models";
import { sendQueueMessageDelay } from '../../lib/sqs';
import { getErc20BalanceOf } from '../../lib/rpc';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * 安全地将值转换为字符串，处理 BigInt 类型
 */
function safeToString(value: unknown): string {
	if (value === undefined || value === null) {
		return '0';
	}
	if (typeof value === 'bigint') {
		return value.toString();
	}
	return String(value);
}

function addBigInt(a: string, b: string): string {
	return (BigInt(a || '0') + BigInt(b || '0')).toString();
}

function subBigInt(a: string, b: string): string {
	return (BigInt(a || '0') - BigInt(b || '0')).toString();
}

async function getSftWrappedTokenInfo(
	chainId: number,
	contractAddress: string,
	timestamp: number,
	transaction: any
): Promise<SftWrappedTokenInfo | null> {
	const lowerAddress = contractAddress.toLowerCase();

	// 先尝试查找 isDefaultSlot 为 true 的记录
	let existing = await SftWrappedTokenInfo.findOne({
		where: {
			chainId,
			tokenAddress: lowerAddress,
			isDefaultSlot: true,
		},
		transaction,
	});

	if (existing) {
		return existing;
	}

	// 如果找不到，尝试查找任意 isDefaultSlot 值的记录（可能是 false 或 null）
	existing = await SftWrappedTokenInfo.findOne({
		where: {
			chainId,
			tokenAddress: lowerAddress,
		},
		transaction,
	});

	if (existing) {
		console.log('Erc20TokenInfoHandler: Found SftWrappedTokenInfo with isDefaultSlot != true', JSON.stringify({
			chainId,
			contractAddress: lowerAddress,
			isDefaultSlot: existing.isDefaultSlot,
		}));
		return existing;
	}

	return null;
}

async function getOrCreateWrappedAssetInfo(
	params: {
		chainId: number;
		contractAddress: string;
		holder: string;
		timestamp: number;
	},
	wrappedInfo: SftWrappedTokenInfo,
	isGetBalance: boolean,
	transaction: any
): Promise<{ asset: RawOptErc20AssetInfo; isBalanceFromRpc: boolean }> {
	const { chainId, contractAddress, holder, timestamp } = params;
	const lowerContractAddress = contractAddress.toLowerCase();
	const lowerHolder = holder.toLowerCase();

	const existing = await RawOptErc20AssetInfo.findOne({
		where: {
			chainId,
			tokenAddress: lowerContractAddress,
			holder: lowerHolder,
		},
		transaction,
	});

	if (existing) {
		return {
			asset: existing,
			isBalanceFromRpc: false,
		};
	}

	// 仅当 isGetBalance 为 true 时才走链上查询；未查询或查询失败(null) 时应用事件加减修正
	let balanceFromRpc: string | null = null;
	if (isGetBalance) {
		balanceFromRpc = await getErc20BalanceOf(chainId, lowerContractAddress, lowerHolder);
	}
	const initialBalance = balanceFromRpc ?? '0';

	const created = await RawOptErc20AssetInfo.create(
		{
			chainId,
			holder: lowerHolder,
			tokenAddress: lowerContractAddress,
			symbol: wrappedInfo.symbol ?? '',
			name: wrappedInfo.name ?? '',
			decimals: wrappedInfo.decimals ?? 0,
			sftAddress: wrappedInfo.sftAddress ?? '',
			slot: wrappedInfo.slot ?? '',
			balance: initialBalance,
			mintTime: timestamp,
			lastUpdated: timestamp,
		},
		{ transaction }
	);

	const isBalanceFromRpc = Boolean(isGetBalance && balanceFromRpc !== null);
	if (isBalanceFromRpc) {
		console.log('Erc20TokenInfoHandler: created RawOptErc20AssetInfo with balance from getErc20BalanceOf', JSON.stringify({
			chainId,
			contractAddress: lowerContractAddress,
			holder: lowerHolder,
			balance: balanceFromRpc,
		}));
	}

	return {
		asset: created,
		isBalanceFromRpc,
	};
}

async function handleTransferEvent(param: HandlerParam, sftWrappedInfo: SftWrappedTokenInfo): Promise<void> {
	const { event, transaction, args } = param;

	const contractAddress = event.contractAddress;
	const chainId = event.chainId;

	const from = String(args.from ?? '').toLowerCase();
	const to = String(args.to ?? '').toLowerCase();
	// 确保 value 转换为字符串（处理 BigInt 类型）
	const valueStr = safeToString(args.value);
	const value = valueStr || '0';
	const timestamp = event.blockTimestamp;

	console.log('Erc20TokenInfoHandler: handleTransferEvent', JSON.stringify({
		chainId,
		contractAddress,
		from,
		to,
		value: valueStr,
		valueStr,
		eventId: event.eventId,
	}));

	if (from !== NULL_ADDRESS) {
		const { asset: fromAsset, isBalanceFromRpc: fromBalanceFromRpc } = await getOrCreateWrappedAssetInfo(
			{
				chainId,
				contractAddress,
				holder: from,
				timestamp,
			},
			sftWrappedInfo,
			true,
			transaction
		);

		if (!fromBalanceFromRpc) {
			// 确保获取到最新的 balance 值（如果是已存在的记录，需要重新加载以确保获取最新值）
			const currentBalance = fromAsset.balance ?? '0';
			const newBalance = subBigInt(currentBalance, value);

			// 确保 newBalance 是有效的数字字符串（不能为空或包含非数字字符）
			const balanceValue = newBalance && newBalance.trim() !== '' ? String(newBalance) : '0';

			console.log('Erc20TokenInfoHandler: handleTransferEvent: fromAsset update', JSON.stringify({
				assetId: fromAsset.id,
				chainId,
				contractAddress,
				holder: from,
				currentBalance,
				value,
				newBalance,
				balanceValue,
				isBalanceFromRpc: fromBalanceFromRpc,
			}));

			// 更新 balance，确保使用字符串格式
			await fromAsset.update(
				{
					balance: balanceValue,
					lastUpdated: timestamp,
				},
				{ transaction }
			);
		}

		// 修改成功后发送 SQS 消息
		if (fromAsset && fromAsset.id) {
			try {
				await sendQueueMessageDelay(chainId, 'assetQueue', {
					source: 'V3_5_Raw_Wrapped_Asset_Info',
					data: {
						id: Number(fromAsset.id),
						chainId: String(chainId),
						contractAddress: contractAddress.toLowerCase(),
					},
				});
			} catch (error) {
				console.error('Erc20TokenInfoHandler: Failed to send SQS message for updated asset (from)', JSON.stringify({
					id: fromAsset.id,
					chainId,
					contractAddress,
					error: error instanceof Error ? error.message : String(error),
				}));
			}
		}
	}

	if (to !== NULL_ADDRESS) {
		const { asset: toAsset, isBalanceFromRpc: toBalanceFromRpc } = await getOrCreateWrappedAssetInfo(
			{
				chainId,
				contractAddress,
				holder: to,
				timestamp,
			},
			sftWrappedInfo,
			from == NULL_ADDRESS ? false : true, 
			transaction
		);

		if (!toBalanceFromRpc || toAsset.balance == '0') {
			// 确保获取到最新的 balance 值（如果是已存在的记录，需要重新加载以确保获取最新值）
			const currentBalance = toAsset.balance ?? '0';
			const newBalance = addBigInt(currentBalance, value);

			// 确保 newBalance 是有效的数字字符串（不能为空或包含非数字字符）
			const balanceValue = newBalance && newBalance.trim() !== '' ? String(newBalance) : '0';

			// 更新 balance，确保使用字符串格式
			await toAsset.update(
				{
					balance: balanceValue,
					lastUpdated: timestamp,
				},
				{ transaction }
			);
		}
		// 修改成功后发送 SQS 消息
		if (toAsset && toAsset.id) {
			try {
				await sendQueueMessageDelay(chainId, 'assetQueue', {
					source: 'V3_5_Raw_Wrapped_Asset_Info',
					data: {
						id: Number(toAsset.id),
						chainId: String(chainId),
						contractAddress: contractAddress.toLowerCase(),
					},
				});
			} catch (error) {
				console.error('Erc20TokenInfoHandler: Failed to send SQS message for updated asset (to)', JSON.stringify({
					id: toAsset.id,
					chainId,
					contractAddress,
					error: error instanceof Error ? error.message : String(error),
				}));
			}
		}
	}
}

async function handleSetAliasEvent(param: HandlerParam, sftWrappedInfo: SftWrappedTokenInfo): Promise<void> {
	const { event, transaction, args } = param;

	const name = String(args.name ?? '');
	const symbol = String(args.symbol ?? '');

	await sftWrappedInfo.update(
		{
			name,
			symbol,
		},
		{ transaction }
	);
}

async function Erc20TokenInfoEvent(param: HandlerParam): Promise<void> {
	const { event, transaction, eventFunc } = param;
	console.log('Erc20TokenInfoHandler: eventSignature', eventFunc, JSON.stringify({
		chainId: event.chainId,
		contractAddress: event.contractAddress,
		eventId: event.eventId,
	}));

	// 统一查询一次，避免重复调用
	const sftWrappedInfo = await getSftWrappedTokenInfo(event.chainId, event.contractAddress, event.blockTimestamp, transaction);
	if (!sftWrappedInfo) {
		console.warn('Erc20TokenInfoHandler: SftWrappedTokenInfo not found', JSON.stringify({
			eventSignature: eventFunc,
			chainId: event.chainId,
			contractAddress: event.contractAddress,
			eventId: event.eventId,
		}));
		return;
	}

	if (eventFunc === 'Transfer(address,address,uint256)') {
		await handleTransferEvent(param, sftWrappedInfo);
	} else if (eventFunc === 'SetAlias(string,string)') {
		await handleSetAliasEvent(param, sftWrappedInfo);
	}
}

export async function handleSftWrappedTokenEvent(param: HandlerParam): Promise<void> {
	await Erc20TokenInfoEvent(param);
}

export async function handleErc20TokenInfoEvent(param: HandlerParam): Promise<void> {
	await Erc20TokenInfoEvent(param);
}