import type { HandlerParam } from '../../types/handler';
import { decodeEventParamsFromAbi } from '../../lib/abi';
import RawOptContractInfo from '../../models/RawOptContractInfo';
import OptRawErc3525TokenInfo from '../../models/RawOptErc3525TokenInfo';
import RawOptPoolSlotInfo from '../../models/RawOptPoolSlotInfo';
import RawOptRedeemSlotInfo from '../../models/RawOptRedeemSlotInfo';
import { getSlotOf, getOwnerOf } from '../../lib/rpc';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_TOKEN_ID = '0';

// 大数运算辅助函数
function addBigInt(a: string, b: string): string {
	return (BigInt(a) + BigInt(b)).toString();
}

function subBigInt(a: string, b: string): string {
	return (BigInt(a) - BigInt(b)).toString();
}

// 查询 TokenInfo 的辅助函数
async function findTokenInfo(
	chainId: number,
	contractAddress: string,
	tokenId: string,
	transaction: any
): Promise<OptRawErc3525TokenInfo | null> {
	return await OptRawErc3525TokenInfo.findOne({
		where: {
			chainId,
			contractAddress: contractAddress.toLowerCase(),
			tokenId,
		},
		transaction,
	});
}

// 处理 TransferValue 事件
async function handleTransferValue(
	event: any,
	args: Record<string, unknown>,
	contractInfo: RawOptContractInfo,
	transaction: any
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const fromTokenId = String(args._fromTokenId ?? '');
	const toTokenId = String(args._toTokenId ?? '');
	const value = String(args._value ?? '');
	const timestamp = event.blockTimestamp;

	// 如果 fromTokenId 不为 0，处理源 token
	let slot = '';
	if (fromTokenId !== ZERO_TOKEN_ID) {
		const fromTokenInfo = await findTokenInfo(event.chainId, contractAddress, fromTokenId, transaction);
		if (!fromTokenInfo) {
			console.warn(`Erc3525TokenInfoHandler: TokenInfo not found for fromTokenId ${fromTokenId}`);
			return;
		}

		// 减少余额
		const balance = fromTokenInfo.balance || '0';
		const newBalance = subBigInt(balance, value);
		await fromTokenInfo.update(
			{
				balance: newBalance,
				lastUpdated: timestamp,
			},
			{ transaction }
		);

		slot = fromTokenInfo.slot || '0';
	}

	// 如果 toTokenId 不为 0，处理目标 token
	if (toTokenId !== ZERO_TOKEN_ID) {
		// 如果 slot 为空，从链上获取
		if (!slot || slot === '0') {
			try {
				slot = await getSlotOf(event.chainId, event.contractAddress, toTokenId);
			} catch (error) {
				console.error('Erc3525TokenInfoHandler: Failed to get slotOf:', error);
				slot = '0';
			}
		}

		// 获取 owner
		let owner = NULL_ADDRESS;
		try {
			owner = await getOwnerOf(event.chainId, event.contractAddress, toTokenId);
		} catch (error) {
			console.error('Erc3525TokenInfoHandler: Failed to get ownerOf:', error);
		}

		// 查询目标 token 信息
		const toTokenInfo = await findTokenInfo(event.chainId, contractAddress, toTokenId, transaction);
		if (!toTokenInfo) {
			console.warn(`Erc3525TokenInfoHandler: TokenInfo not found for toTokenId ${toTokenId}`);
			return;
		}

		// 增加余额
		const balance = toTokenInfo.balance || '0';
		const newBalance = addBigInt(balance, value);

		// 准备更新数据
		const updateData: any = {
			balance: newBalance,
			lastUpdated: timestamp,
			slot,
			holder: owner.toLowerCase(),
		};

		// 根据 contractType 查询对应的 SlotInfo（如果需要 poolId 可以在这里设置）
		if (contractInfo.contractType === 'Open Fund Shares') {
			await RawOptPoolSlotInfo.findOne({
				where: {
					chainId: event.chainId,
					contractAddress,
					slot,
				},
				transaction,
			});
			// 如果需要设置 poolId: updateData.poolId = poolSlot?.poolId;
		} else if (contractInfo.contractType === 'Open Fund Redemptions') {
			await RawOptRedeemSlotInfo.findOne({
				where: {
					chainId: event.chainId,
					contractAddress,
					slot,
				},
				transaction,
			});
			// 如果需要设置 poolId: updateData.poolId = redeemSlot?.poolId;
		}

		await toTokenInfo.update(updateData, { transaction });

		// 如果 fromTokenId 不为 0，也需要更新其 slot
		if (fromTokenId !== ZERO_TOKEN_ID) {
			const fromTokenInfo = await findTokenInfo(event.chainId, contractAddress, fromTokenId, transaction);
			if (fromTokenInfo) {
				await fromTokenInfo.update({ slot }, { transaction });
			}
		}
	}
}

// 处理 Mint 操作
async function handleMint(
	chainId: number,
	contractAddress: string,
	tokenId: string,
	to: string,
	timestamp: number,
	transaction: any
): Promise<void> {
	// 获取 slot
	let slot = '0';
	try {
		slot = await getSlotOf(chainId, contractAddress, tokenId);
	} catch (error) {
		console.error('Erc3525TokenInfoHandler: Failed to get slotOf for mint:', error);
	}

	// 创建新的 TokenInfo
	await OptRawErc3525TokenInfo.create(
		{
			chainId,
			contractAddress,
			tokenId,
			slot,
			balance: '0',
			holder: to,
			mintTime: timestamp,
			isBurned: 0,
			lastUpdated: timestamp,
		},
		{ transaction }
	);
}

// 处理普通转账或 Burn 操作
async function handleTransferOrBurn(
	chainId: number,
	contractAddress: string,
	tokenId: string,
	to: string,
	timestamp: number,
	transaction: any
): Promise<{ supplyDelta: string; isBurned: boolean }> {
	const tokenInfo = await findTokenInfo(chainId, contractAddress, tokenId, transaction);
	if (!tokenInfo) {
		console.warn(`Erc3525TokenInfoHandler: TokenInfo not found for tokenId ${tokenId} in Transfer event`);
		throw new Error(`TokenInfo not found for tokenId ${tokenId}`);
	}

	// 更新 holder 和 lastUpdated
	const updateData: any = {
		holder: to,
		lastUpdated: timestamp,
	};

	// 如果 to 是 nullAddress，标记为 burned
	const isBurned = to === NULL_ADDRESS;
	if (isBurned) {
		updateData.isBurned = 1;
	}

	await tokenInfo.update(updateData, { transaction });

	return {
		supplyDelta: isBurned ? '1' : '0', // burn 时返回 '1' 表示需要减 1
		isBurned,
	};
}

// 处理 Transfer 事件
async function handleTransfer(
	event: any,
	args: Record<string, unknown>,
	contractInfo: RawOptContractInfo,
	transaction: any
): Promise<void> {
	const contractAddress = event.contractAddress.toLowerCase();
	const tokenId = String(args._tokenId ?? '');
	const from = String(args._from ?? '').toLowerCase();
	const to = String(args._to ?? '').toLowerCase();
	const timestamp = event.blockTimestamp;

	let totalSupply = contractInfo.totalSupply || '0';

	// 根据 from 地址判断操作类型
	if (from === NULL_ADDRESS) {
		// Mint 操作：增加 totalSupply
		totalSupply = addBigInt(totalSupply, '1');
		await handleMint(event.chainId, contractAddress, tokenId, to, timestamp, transaction);
	} else {
		// 普通转账或 Burn 操作
		try {
			const result = await handleTransferOrBurn(event.chainId, contractAddress, tokenId, to, timestamp, transaction);
			// 如果是 burn 操作，减少 totalSupply
			if (result.isBurned) {
				totalSupply = subBigInt(totalSupply, '1');
			}
		} catch (error) {
			// TokenInfo 不存在时直接返回
			return;
		}
	}

	// 更新合约信息
	await contractInfo.update(
		{
			totalSupply,
			lastUpdated: timestamp,
		},
		{ transaction }
	);
}

export async function handleErc3525TokenInfoEvent(param: HandlerParam): Promise<void> {
	const { event, transaction } = param;
	const args = decodeEventParamsFromAbi('OpenFundShareDelegate.json', event);

	const eventSignatures: Record<string, string> = {
		'0x0b2aac84f3ec956911fd78eae5311062972ff949f38412e8da39069d9f068cc6': 'TransferValue',
		'0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer',
	};

	const eventSignature = eventSignatures[event.eventSignature] || 'Unknown';
	console.log('Erc3525TokenInfoHandler: eventSignature', eventSignature);

	if (eventSignature === 'TransferValue') {
		// 查询合约信息
		const contractInfo = await RawOptContractInfo.findOne({
			where: {
				chainId: event.chainId,
				contractAddress: event.contractAddress.toLowerCase(),
			},
			transaction,
		});

		if (!contractInfo) {
			console.warn(`Erc3525TokenInfoHandler: ContractInfo not found for ${event.contractAddress}`);
			return;
		}

		// 更新合约的 lastUpdated
		await contractInfo.update(
			{
				lastUpdated: event.blockTimestamp,
			},
			{ transaction }
		);

		// 处理 TransferValue 事件
		await handleTransferValue(event, args, contractInfo, transaction);
	} else if (eventSignature === 'Transfer') {
		// 查询合约信息
		const contractInfo = await RawOptContractInfo.findOne({
			where: {
				chainId: event.chainId,
				contractAddress: event.contractAddress.toLowerCase(),
			},
			transaction,
		});

		if (!contractInfo) {
			console.warn(`Erc3525TokenInfoHandler: ContractInfo not found for ${event.contractAddress}`);
			return;
		}

		// 处理 Transfer 事件
		await handleTransfer(event, args, contractInfo, transaction);
	}
}
