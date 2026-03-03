import type { Transaction } from 'sequelize';
import type { EventEvm } from '../../../types/eventEvm';
import type { HandlerParam } from '../../../types/handler';
import {RawOptActivity} from "@solvprotocol/models";
import {CurrencyInfo} from "@solvprotocol/models";
import { createActivity } from '../ActivityHandler';
import { resolveNav } from '../../../services/activityService';

const ZERO_VALUE = '0';
const DEFAULT_DECIMALS = 18;

export async function handleXSolvBTCPoolDeposit(event: EventEvm, args: HandlerParam['args'], transaction: Transaction): Promise<void> {
    await handleXSolvBTCPoolActivity(event, args, transaction, 'Deposit');
}

export async function handleXSolvBTCPoolWithdraw(event: EventEvm, args: HandlerParam['args'], transaction: Transaction): Promise<void> {
    await handleXSolvBTCPoolActivity(event, args, transaction, 'Withdraw');
}

async function handleXSolvBTCPoolActivity(
    event: EventEvm,
    args: HandlerParam['args'],
    transaction: Transaction,
    eventType: 'Deposit' | 'Withdraw'
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

    let currencyAddress = '';
    if (eventType === 'Deposit') {
        currencyAddress = args.solvBTC !== undefined ? String(args.solvBTC).toLowerCase() : '';
    } else {
        currencyAddress = args.xSolvBTC !== undefined ? String(args.xSolvBTC).toLowerCase() : '';
    }

    let symbol = '';
    let decimals = DEFAULT_DECIMALS;
    if (currencyAddress) {
        const currencyInfo = await CurrencyInfo.findOne({
            where: {
                chainId: event.chainId,
                currencyAddress,
            },
            transaction,
        });
        if (currencyInfo?.symbol) {
            symbol = currencyInfo.symbol;
        }
        if (currencyInfo?.decimals !== undefined && currencyInfo.decimals !== null) {
            decimals = currencyInfo.decimals;
        }
    }

    const nav = resolveNav(decimals) ?? ZERO_VALUE;

    let transactionType = '';
    let fromAddress = '';
    let toAddress = '';
    let amount = ZERO_VALUE;

    if (eventType === 'Deposit') {
        transactionType = 'Deposit';
        fromAddress = args.owner !== undefined ? String(args.owner).toLowerCase() : '';
        toAddress = event.contractAddress.toLowerCase();
        amount = args.xSolvBTCAmount !== undefined ? String(args.xSolvBTCAmount) : ZERO_VALUE;
    } else {
        transactionType = 'Unstake';
        fromAddress = event.contractAddress.toLowerCase();
        toAddress = args.owner !== undefined ? String(args.owner).toLowerCase() : '';
        amount = args.solvBTCAmount !== undefined ? String(args.solvBTCAmount) : ZERO_VALUE;
    }

    await createActivity({
        chainId: event.chainId,
        contractAddress: event.contractAddress,
        tokenId: ZERO_VALUE,
        txHash: event.transactionHash,
        timestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex,
        eventIndex: event.logIndex,
        fromAddress,
        toAddress,
        amount,
        decimals,
        currencyAddress,
        currencySymbol: symbol,
        currencyDecimals: decimals,
        slot: ZERO_VALUE,
        transactionType,
        productType: '',
        nav,
        poolId: '',
        blockNumber: event.blockNumber,
        transaction,
    });
}
