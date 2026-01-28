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

	const existing = await RawOptErc20AssetInfo.findOne({
		where: {
			chainId,
			tokenAddress: contractAddress,
			holder,
		},
		transaction,
	});

	if (existing) {
		return existing;
	}

	const created = await RawOptErc20AssetInfo.create(
		{
			chainId,
			holder,
			tokenAddress: contractAddress,
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

async function handleTransferEvent(param: HandlerParam): Promise<void> {
	const { event, transaction, args } = param;

	const contractAddress = event.contractAddress;
	const chainId = event.chainId;

	const from = String(args.from ?? '').toLowerCase();
	const to = String(args.to ?? '').toLowerCase();
	const valueStr = String(args.value ?? '0');
	const value = valueStr || '0';

	const timestamp = event.blockTimestamp;

	const sftWrappedInfo = await getSftWrappedTokenInfo(chainId, contractAddress, timestamp, transaction);
	if (!sftWrappedInfo) {
		console.warn('Erc20TokenInfoHandler: SftWrappedTokenInfo not found for Transfer', {
			chainId,
			contractAddress: contractAddress,
		});
		return;
	}

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

async function handleSetAliasEvent(param: HandlerParam): Promise<void> {
	const { event, transaction, args } = param;

	const contractAddress = event.contractAddress.toLowerCase();
	const chainId = event.chainId;

	const name = String(args.name ?? '');
	const symbol = String(args.symbol ?? '');

	const existing = await SftWrappedTokenInfo.findOne({
		where: {
			chainId,
			tokenAddress: contractAddress,
		},
		transaction,
	});

	if (!existing) {
		console.warn(
			'Erc20TokenInfoHandler: SftWrappedTokenInfo not found for SetAlias',
			{ chainId, contractAddress }
		);
		return;
	}

	await existing.update(
		{
			name,
			symbol,
		},
		{ transaction }
	);
}

export async function handleErc20TokenInfoEvent(param: HandlerParam): Promise<void> {
	const { eventSignature } = param;
	console.log('Erc20TokenInfoHandler: eventSignature', eventSignature);
	if (eventSignature === 'Transfer(address,address,uint256)') {
		await handleTransferEvent(param);
	} else if (eventSignature === 'SetAlias(string,string)') {
		await handleSetAliasEvent(param);
	}
}

