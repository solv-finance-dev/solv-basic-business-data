import type { HandlerParam } from '../../types/handler';
import RawOptMarketContract from '../../models/RawOptMarketContract';
import { getErc3525TokenMetadata } from '../../lib/rpc';
import { sendQueueMessage } from '../../lib/sqs';

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

    // 创建成功后发送 SQS 消息
    if (created && created.id) {
        try {
            await sendQueueMessage(chainId, 'configQueue', {
                source: 'V3_5_Raw_Market_Contract',
                data: {
                    id: Number(created.id),
                    chainId: String(chainId),
                    contractAddress: lowerSftAddress,
                },
            });
        } catch (error) {
            console.error('MarketContractHandler: Failed to send SQS message for new market contract', {
                id: created.id,
                chainId,
                marketContractAddress: lowerMarketAddress,
                contractAddress: lowerSftAddress,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return created;
}

// 统一更新 RawOptMarketContract 并发送 SQS
async function updateMarketContractAndSendSQS(
    marketContract: RawOptMarketContract,
    updateData: {
        issuer?: string;
        state?: string;
        lastUpdated?: number;
    },
    transaction: any
): Promise<void> {
    await marketContract.update(updateData, { transaction });

    try {
        await sendQueueMessage(marketContract.chainId, 'configQueue', {
            source: 'V3_5_Raw_Market_Contract',
            data: {
                id: Number(marketContract.id),
                chainId: String(marketContract.chainId),
                contractAddress: marketContract.contractAddress,
            },
        });
    } catch (error) {
        console.error('MarketContractHandler: Failed to send SQS message for updated market contract', {
            id: marketContract.id,
            chainId: marketContract.chainId,
            marketContractAddress: marketContract.marketContractAddress,
            contractAddress: marketContract.contractAddress,
            error: error instanceof Error ? error.message : String(error),
        });
    }
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

    // 更新市场合约信息并发送 SQS
    await updateMarketContractAndSendSQS(
        marketContract,
        {
            issuer: manager,
            lastUpdated: timestamp,
        },
        transaction
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

    // 更新市场合约信息并发送 SQS
    await updateMarketContractAndSendSQS(
        marketContract,
        {
            state: 'Suspended',
            lastUpdated: timestamp,
        },
        transaction
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