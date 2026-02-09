import type {Transaction} from 'sequelize';
import {Op} from 'sequelize';
import type {EventEvm} from '../../../types/eventEvm';
import type {HandlerParam} from '../../../types/handler';
import {RouterContractInfo} from '@solvprotocol/models';
import RawOptActivity from '../../../models/RawOptActivity';
import RawOptPoolOrderInfo from '../../../models/RawOptPoolOrderInfo';
import RawOptPoolSlotInfo from '../../../models/RawOptPoolSlotInfo';
import RawOptContractInfo from '../../../models/RawOptContractInfo';
import SftWrappedTokenInfo from '../../../models/SftWrappedTokenInfo';
import {getChainConfig, getErc20Metadata} from '../../../services/evmService';
import {createActivity} from '../ActivityHandler';

const ZERO_VALUE = '0';
const TRANSFER_TYPE = 'Transfer';

// Handle SftWrappedToken Transfer event.
export async function handleSftWrappedTokenTransfer(event: EventEvm, args: HandlerParam['args'], transaction: Transaction): Promise<void> {
    const fromAddress = args.from !== undefined ? String(args.from).toLowerCase() : undefined;
    const toAddress = args.to !== undefined ? String(args.to).toLowerCase() : undefined;
    if (!fromAddress || !toAddress) {
        console.warn('ActivityHandler: SftWrappedToken transfer missing from/to', {
            eventId: event.eventId,
            args,
        });
        return;
    }

    const isRouterAddress = await isRouterContract(event.chainId, fromAddress, toAddress, transaction);
    if (isRouterAddress) {
        console.log('ActivityHandler: SftWrappedToken transfer skipped for router contract', {
            fromAddress,
            toAddress,
            eventId: event.eventId,
        });
        return;
    }

    const sftWrappedTokenInfo = await getSftWrappedTokenInfo(event.chainId, event.contractAddress, event.blockTimestamp, transaction);
    if (!sftWrappedTokenInfo) {
        console.warn('ActivityHandler: SftWrappedTokenInfo not found', {
            chainId: event.chainId,
            contractAddress: event.contractAddress,
            eventId: event.eventId,
        });
        return;
    }

    const wrappedSft = sftWrappedTokenInfo.sftAddress ? sftWrappedTokenInfo.sftAddress.toLowerCase() : '';
    const wrappedSftSlot = sftWrappedTokenInfo.slot ? String(sftWrappedTokenInfo.slot) : '';
    if (!wrappedSft || !wrappedSftSlot) {
        console.warn('ActivityHandler: SftWrappedTokenInfo missing wrappedSft or slot', {
            chainId: event.chainId,
            contractAddress: event.contractAddress,
            eventId: event.eventId,
        });
        return;
    }

    const poolSlotInfo = await RawOptPoolSlotInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress: wrappedSft,
            slot: wrappedSftSlot,
        },
        transaction,
    });
    if (!poolSlotInfo?.poolId) {
        console.warn('ActivityHandler: PoolSlotInfo not found for SftWrappedToken', {
            chainId: event.chainId,
            contractAddress: wrappedSft,
            slot: wrappedSftSlot,
            eventId: event.eventId,
        });
        return;
    }

    const poolOrderInfo = await RawOptPoolOrderInfo.findOne({
        where: {
            chainId: event.chainId,
            poolId: String(poolSlotInfo.poolId).toLowerCase(),
        },
        transaction,
    });
    if (!poolOrderInfo?.openFundShare) {
        console.warn('ActivityHandler: PoolOrderInfo not found for SftWrappedToken', {
            chainId: event.chainId,
            poolId: poolSlotInfo.poolId,
            eventId: event.eventId,
        });
        return;
    }

    const contractInfo = await RawOptContractInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress: String(poolOrderInfo.openFundShare).toLowerCase(),
        },
        transaction,
    });
    if (!contractInfo?.contractType) {
        console.warn('ActivityHandler: ContractInfo not found for SftWrappedToken', {
            chainId: event.chainId,
            contractAddress: poolOrderInfo.openFundShare,
            eventId: event.eventId,
        });
        return;
    }

    const existing = await RawOptActivity.findOne({
        where: {
            chainId: event.chainId,
            txHash: event.transactionHash,
            eventIndex: event.logIndex,
            transactionIndex: event.transactionIndex,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    await createActivity({
        chainId: event.chainId,
        contractAddress: event.contractAddress,
        tokenId: ZERO_VALUE,
        txHash: event.transactionHash,
        timestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex,
        eventIndex: event.logIndex,
        fromAddress: fromAddress,
        toAddress: toAddress,
        amount: args.value !== undefined ? String(args.value) : ZERO_VALUE,
        decimals: sftWrappedTokenInfo.decimals,
        currencyAddress: event.contractAddress,
        currencySymbol: sftWrappedTokenInfo.symbol,
        currencyDecimals: sftWrappedTokenInfo.decimals,
        slot: wrappedSftSlot,
        transactionType: TRANSFER_TYPE,
        productType: contractInfo.contractType,
        nav: ZERO_VALUE,
        poolId: String(poolSlotInfo.poolId),
        blockNumber: event.blockNumber,
        transaction,
    });
}

async function isRouterContract(chainId: number, fromAddress: string, toAddress: string, transaction: Transaction): Promise<boolean> {
    const addresses = [fromAddress.toLowerCase(), toAddress.toLowerCase()];
    const router = await RouterContractInfo.findOne({
        where: {
            chainId,
            contractAddress: {
                [Op.in]: addresses,
            },
        },
        transaction,
    });

    return !!router;
}

async function getSftWrappedTokenInfo(
    chainId: number,
    sftWrappedToken: string,
    timestamp: number,
    transaction: Transaction
): Promise<SftWrappedTokenInfo | null> {
    const tokenAddress = sftWrappedToken.toLowerCase();
    const info = await SftWrappedTokenInfo.findOne({
        where: {
            chainId,
            tokenAddress,
        },
        transaction,
    });
    if (!info) {
        return null;
    }

    const saveTokenTimestamp = getSaveTokenTimestamp(chainId, tokenAddress);
    if (saveTokenTimestamp !== undefined && timestamp >= saveTokenTimestamp) {
        const updatedAt = info.updatedAt ? Math.floor(info.updatedAt.getTime() / 1000) : 0;
        if (!updatedAt || updatedAt < saveTokenTimestamp) {
            const metadata = await getErc20Metadata(chainId, tokenAddress);
            const updated = await info.update(
                {
                    name: metadata.name,
                    symbol: metadata.symbol,
                },
                {transaction},
            );
            info.name = updated.name;
            info.symbol = updated.symbol;
            console.log("updateSftWrappedTokenInfo: ", updated.name, updated.name);
            return updated;
        }
    }

    return info;
}

function getSaveTokenTimestamp(chainId: number, tokenAddress: string): number | undefined {
    const chainConfig = getChainConfig(chainId);
    const timestampMap = chainConfig?.config?.saveSftWrappedTokenTimestamp;
    if (!timestampMap) {
        return undefined;
    }

    const raw = timestampMap[tokenAddress.toLowerCase()];
    return raw !== undefined ? Number(raw) : undefined;
}
