import type { Transaction } from 'sequelize';
import type { EventEvm } from '../../../types/eventEvm';
import type { HandlerParam } from '../../../types/handler';
import RawOptActivity from '../../../models/RawOptActivity';
import RawOptPoolOrderInfo from '../../../models/RawOptPoolOrderInfo';
import RawOptContractInfo from '../../../models/RawOptContractInfo';
import CurrencyInfo from '../../../models/CurrencyInfo';
import { createActivity } from '../ActivityHandler';
import { getSubscribeNav } from '../../../services/activityService';

const ZERO_VALUE = '0';
const DEFAULT_DECIMALS = 18;

export async function handleSolvBTCRouterV2Deposit(event: EventEvm, args: HandlerParam['args'], transaction: Transaction): Promise<void> {
    const poolIds = args.poolIds as string[] | undefined;
    const poolId = poolIds && poolIds.length > 0 ? String(poolIds[poolIds.length - 1]).toLowerCase() : '';
    await handleSolvBTCRouterV2Activity(event, args, transaction, poolId, 'Deposit');
}

export async function handleSolvBTCRouterV2WithdrawRequest(event: EventEvm, args: HandlerParam['args'], transaction: Transaction): Promise<void> {
    const poolId = args.poolId !== undefined ? String(args.poolId).toLowerCase() : '';
    await handleSolvBTCRouterV2Activity(event, args, transaction, poolId, 'WithdrawRequest');
}

export async function handleSolvBTCRouterV2CancelWithdrawRequest(event: EventEvm, args: HandlerParam['args'], transaction: Transaction): Promise<void> {
    const poolId = args.poolId !== undefined ? String(args.poolId).toLowerCase() : '';
    await handleSolvBTCRouterV2Activity(event, args, transaction, poolId, 'CancelWithdrawRequest');
}

async function handleSolvBTCRouterV2Activity(
    event: EventEvm,
    args: HandlerParam['args'],
    transaction: Transaction,
    poolId: string,
    eventType: 'Deposit' | 'WithdrawRequest' | 'CancelWithdrawRequest'
): Promise<void> {
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

    let decimals = DEFAULT_DECIMALS;
    let symbol = '';
    let productType = '';
    let contractDecimals = DEFAULT_DECIMALS;
    let slot = ZERO_VALUE;
    let currencyAddress = '';

    const poolOrderInfo = poolId ? await RawOptPoolOrderInfo.findOne({
        where: {
            chainId: event.chainId,
            poolId,
        },
        transaction,
    }) : null;

    if (poolOrderInfo) {
        slot = poolOrderInfo.openFundShareSlot ? String(poolOrderInfo.openFundShareSlot) : ZERO_VALUE;
        currencyAddress = poolOrderInfo.currency ? String(poolOrderInfo.currency).toLowerCase() : '';

        if (currencyAddress) {
            const currencyInfo = await CurrencyInfo.findOne({
                where: {
                    chainId: event.chainId,
                    currencyAddress,
                },
                transaction,
            });
            if (currencyInfo?.decimals !== undefined && currencyInfo.decimals !== null) {
                decimals = currencyInfo.decimals;
            }
            if (currencyInfo?.symbol) {
                symbol = currencyInfo.symbol;
            }
        }

        if (poolOrderInfo.openFundShare) {
            const contractInfo = await RawOptContractInfo.findOne({
                where: {
                    chainId: event.chainId,
                    contractAddress: String(poolOrderInfo.openFundShare).toLowerCase(),
                },
                transaction,
            });
            if (contractInfo?.contractType) {
                productType = contractInfo.contractType;
            }
            if (contractInfo?.decimals !== undefined && contractInfo.decimals !== null) {
                contractDecimals = contractInfo.decimals;
            }
        }
    }

    const nav = await getSubscribeNav(poolId, event.blockTimestamp, decimals);

    let transactionType = '';
    let tokenId = ZERO_VALUE;
    let fromAddress = '';
    let toAddress = '';
    let amount = ZERO_VALUE;

    if (eventType === 'CancelWithdrawRequest') {
        transactionType = 'Revoke';
        tokenId = args.redemptionId !== undefined ? String(args.redemptionId) : ZERO_VALUE;
        fromAddress = args.targetToken !== undefined ? String(args.targetToken).toLowerCase() : '';
        toAddress = args.requester !== undefined ? String(args.requester).toLowerCase() : '';
        amount = args.targetTokenAmount !== undefined ? String(args.targetTokenAmount) : ZERO_VALUE;
    } else if (eventType === 'Deposit') {
        transactionType = poolOrderInfo ? 'Sale' : 'Stake';
        fromAddress = args.targetToken !== undefined ? String(args.targetToken).toLowerCase() : '';
        toAddress = args.depositor !== undefined ? String(args.depositor).toLowerCase() : '';
        amount = args.targetTokenAmount !== undefined ? String(args.targetTokenAmount) : ZERO_VALUE;
    } else if (eventType === 'WithdrawRequest') {
        transactionType = 'Redeem';
        tokenId = args.redemptionId !== undefined ? String(args.redemptionId) : ZERO_VALUE;
        fromAddress = args.requester !== undefined ? String(args.requester).toLowerCase() : '';
        toAddress = args.targetToken !== undefined ? String(args.targetToken).toLowerCase() : '';
        amount = args.withdrawAmount !== undefined ? String(args.withdrawAmount) : ZERO_VALUE;
    }

    await createActivity({
        chainId: event.chainId,
        contractAddress: event.contractAddress,
        tokenId,
        txHash: event.transactionHash,
        timestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex,
        eventIndex: event.logIndex,
        fromAddress,
        toAddress,
        amount,
        decimals: contractDecimals,
        currencyAddress,
        currencySymbol: symbol,
        currencyDecimals: decimals,
        slot,
        transactionType,
        productType,
        nav: nav ?? ZERO_VALUE,
        poolId,
        blockNumber: event.blockNumber,
        transaction,
    });
}
