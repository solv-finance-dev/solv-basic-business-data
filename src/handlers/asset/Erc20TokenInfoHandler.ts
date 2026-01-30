import type { HandlerParam } from '../../types/handler';
import SftWrappedTokenInfo from '../../models/SftWrappedTokenInfo';
import RawOptErc20AssetInfo from '../../models/RawOptErc20AssetInfo';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

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

	const existing = await SftWrappedTokenInfo.findOne({
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
	transaction: any
): Promise<RawOptErc20AssetInfo> {
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
		return existing;
	}

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
			balance: '0',
			mintTime: timestamp,
			lastUpdated: timestamp,
		},
		{ transaction }
	);

	return created;
}

async function handleTransferEvent(param: HandlerParam, sftWrappedInfo: SftWrappedTokenInfo): Promise<void> {
	const { event, transaction, args } = param;

	const contractAddress = event.contractAddress;
	const chainId = event.chainId;

	const from = String(args.from ?? '').toLowerCase();
	const to = String(args.to ?? '').toLowerCase();
	const valueStr = String(args.value ?? '0');
	const value = valueStr || '0';

	const timestamp = event.blockTimestamp;

	if (from !== NULL_ADDRESS) {
		const fromAsset = await getOrCreateWrappedAssetInfo(
			{
				chainId,
				contractAddress,
				holder: from,
				timestamp,
			},
			sftWrappedInfo,
			transaction
		);

		const currentBalance = fromAsset.balance ?? '0';
		const newBalance = subBigInt(currentBalance, value);

		await fromAsset.update(
			{
				balance: newBalance,
				lastUpdated: timestamp,
			},
			{ transaction }
		);
	}

	if (to !== NULL_ADDRESS) {
		const toAsset = await getOrCreateWrappedAssetInfo(
			{
				chainId,
				contractAddress,
				holder: to,
				timestamp,
			},
			sftWrappedInfo,
			transaction
		);

		const currentBalance = toAsset.balance ?? '0';
		const newBalance = addBigInt(currentBalance, value);

		await toAsset.update(
			{
				balance: newBalance,
				lastUpdated: timestamp,
			},
			{ transaction }
		);
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

export async function handleErc20TokenInfoEvent(param: HandlerParam): Promise<void> {
	const { event, transaction, eventFunc } = param;
	console.log('Erc20TokenInfoHandler: eventSignature', eventFunc);

	// 统一查询一次，避免重复调用
	const sftWrappedInfo = await getSftWrappedTokenInfo(event.chainId, event.contractAddress, event.blockTimestamp, transaction);
	if (!sftWrappedInfo) {
		console.warn('Erc20TokenInfoHandler: SftWrappedTokenInfo not found', {
			eventSignature: eventFunc,
			chainId: event.chainId,
			contractAddress: event.contractAddress,
		});
		return;
	}

	if (eventFunc === 'Transfer(address,address,uint256)') {
		await handleTransferEvent(param, sftWrappedInfo);
	} else if (eventFunc === 'SetAlias(string,string)') {
		await handleSetAliasEvent(param, sftWrappedInfo);
	}
}

