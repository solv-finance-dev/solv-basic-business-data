import type { HandlerParam } from '../../types/handler';
import RawOptMarketContract from '../../models/RawOptMarketContract';
import { getErc3525TokenMetadata } from '../../lib/rpc';

async function getOrCreateMarketContract(
    chainId: number,
    marketAddress: string,
    sftAddress: string,
    timestamp: number,
    transaction: any
): Promise<RawOptMarketContract> {
    const lowerMarketAddress = marketAddress.toLowerCase();
    const lowerSftAddress = sftAddress.toLowerCase();

    const existing = await RawOptMarketContract.findOne({
        where: {
            chainId,
            marketContractAddress: lowerMarketAddress,
            contractAddress: lowerSftAddress,
        },
        transaction,
    });

    if (existing) {
        return existing;
    }

    let decimals = 0;
    try {
        const erc3525Token = await getErc3525TokenMetadata(chainId, lowerSftAddress);
        decimals = erc3525Token.decimals;
    } catch (error) {
        console.warn(`MarketContractHandler: Failed to get valueDecimals for ${lowerSftAddress}:`, error);
    }

    const created = await RawOptMarketContract.create(
        {
            chainId,
            marketContractAddress: lowerMarketAddress,
            contractAddress: lowerSftAddress,
            issuer: '',
            decimals,
            state: 'Active',
            lastUpdated: timestamp,
        },
        { transaction }
    );

    return created;
}

async function handleAddSFTEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const marketAddress = event.contractAddress;
    const chainId = event.chainId;
    const sft = String(args.sft ?? '').toLowerCase();
    const manager = String(args.manager ?? '').toLowerCase();
    const timestamp = event.blockTimestamp;

    const marketContract = await getOrCreateMarketContract(
        chainId,
        marketAddress,
        sft,
        timestamp,
        transaction
    );

    await marketContract.update(
        {
            issuer: manager,
            lastUpdated: timestamp,
        },
        { transaction }
    );
}

async function handleRemoveSFTEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const marketAddress = event.contractAddress;
    const chainId = event.chainId;
    const sft = String(args.sft ?? '').toLowerCase();
    const timestamp = event.blockTimestamp;

    const marketContract = await getOrCreateMarketContract(
        chainId,
        marketAddress,
        sft,
        timestamp,
        transaction
    );

    await marketContract.update(
        {
            state: 'Suspended',
            lastUpdated: timestamp,
        },
        { transaction }
    );
}

export async function handleMarketContractEvent(param: HandlerParam): Promise<void> {
    const { eventFunc } = param;

    if (eventFunc === 'AddSFT(address,address)') {
        await handleAddSFTEvent(param);
    } else if (eventFunc === 'RemoveSFT(address)') {
        await handleRemoveSFTEvent(param);
    }
}