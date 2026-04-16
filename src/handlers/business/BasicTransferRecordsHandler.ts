import BasicTokenTransferRecords from '../../models/business/BasicTokenTransferRecords';
import BasicSolvbtcMintBurn from '../../models/business/BasicSolvbtcMintBurn';
import BasicWrappedAssetInfo from '../../models/business/BasicWrappedAssetInfo';
import {getBusinessSequelize} from '../../lib/dbClient';
import {getErc20Metadata} from '../../services/evmService';
import {Sequelize} from 'sequelize-typescript';
import type {HandlerParam} from '../../types/handler';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export async function handleTransferEvent(param: HandlerParam): Promise<void> {
    const {event, args} = param;
    const from = String(args.from).toLowerCase();
    const to = String(args.to).toLowerCase();
    const value = String(args.value);
    const contractAddress = event.contractAddress.toLowerCase();

    await getBusinessSequelize();
    const {symbol, decimals} = await getErc20Metadata(event.chainId, contractAddress);

    // 1. basic_token_transfer_records — append-only source record
    //    created = true → new event, proceed to downstream tables
    //    created = false → duplicate (replay), skip all downstream writes
    const [, created] = await BasicTokenTransferRecords.findOrCreate({
        where: {txHash: event.transactionHash, logIndex: event.logIndex},
        defaults: {
            chainId: event.chainId,
            contractAddress,
            symbol,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            logIndex: event.logIndex,
            fromAddress: from,
            toAddress: to,
            amount: value,
            decimals,
            blockTimestamp: event.blockTimestamp,
        },
    });

    if (!created) return; // idempotent gate

    // 2. basic_solvbtc_mint_burn — only mint/burn (from/to = 0x0)
    if (from === ZERO_ADDRESS) {
        await BasicSolvbtcMintBurn.findOrCreate({
            where: {txHash: event.transactionHash, logIndex: event.logIndex},
            defaults: {
                chainId: event.chainId,
                contractAddress,
                symbol,
                txHash: event.transactionHash,
                blockNumber: event.blockNumber,
                logIndex: event.logIndex,
                eventType: 'Mint',
                address: to,
                amount: value,
                decimals,
                blockTimestamp: event.blockTimestamp,
            },
        });
    } else if (to === ZERO_ADDRESS) {
        await BasicSolvbtcMintBurn.findOrCreate({
            where: {txHash: event.transactionHash, logIndex: event.logIndex},
            defaults: {
                chainId: event.chainId,
                contractAddress,
                symbol,
                txHash: event.transactionHash,
                blockNumber: event.blockNumber,
                logIndex: event.logIndex,
                eventType: 'Burn',
                address: from,
                amount: value,
                decimals,
                blockTimestamp: event.blockTimestamp,
            },
        });
    }

    // 3. basic_wrapped_asset_info — atomic balance update
    if (from !== ZERO_ADDRESS) {
        await BasicWrappedAssetInfo.findOrCreate({
            where: {chainId: event.chainId, tokenAddress: contractAddress, holder: from},
            defaults: {symbol, decimals, balance: '0', lastUpdated: event.blockTimestamp},
        });
        await BasicWrappedAssetInfo.update(
            {
                balance: Sequelize.literal(`balance - ${value}`),
                lastUpdated: event.blockTimestamp,
            },
            {where: {chainId: event.chainId, tokenAddress: contractAddress, holder: from}},
        );
    }

    if (to !== ZERO_ADDRESS) {
        await BasicWrappedAssetInfo.findOrCreate({
            where: {chainId: event.chainId, tokenAddress: contractAddress, holder: to},
            defaults: {symbol, decimals, balance: '0', lastUpdated: event.blockTimestamp},
        });
        await BasicWrappedAssetInfo.update(
            {
                balance: Sequelize.literal(`balance + ${value}`),
                lastUpdated: event.blockTimestamp,
            },
            {where: {chainId: event.chainId, tokenAddress: contractAddress, holder: to}},
        );
    }
}
