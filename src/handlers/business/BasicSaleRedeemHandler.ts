import BasicSaleRedeem from '../../models/business/BasicSaleRedeem';
import BizCurrencyInfo from '../../models/business/BizCurrencyInfo';
import BizPoolOrderSlotInfo from '../../models/business/BizPoolOrderSlotInfo';
import {getBusinessSequelize} from '../../lib/dbClient';
import {getErc20Metadata} from '../../services/evmService';
import {toOptionalString, toOptionalLowercaseAddress} from '../../lib/utils';
import type {HandlerParam} from '../../types/handler';

const ZERO_AMOUNT = '0';
const ZERO_TOKEN_ID = '0';

const EVENT_SIGNATURES = {
    SUBSCRIBE: 'Subscribe(bytes32,address,uint256,uint256,address,uint256,uint256)',
    REQUEST_REDEEM: 'RequestRedeem(bytes32,address,uint256,uint256,uint256)',
    CREATE_SUBSCRIPTION: 'CreateSubscription(bytes32,address,address,uint256,address,uint256)',
    CREATE_REDEMPTION: 'CreateRedemption(bytes32,address,address,uint256,uint256)',
    DEPOSIT: 'Deposit(address,address,address,uint256,uint256,address[],bytes32[])',
    WITHDRAW_REQUEST: 'WithdrawRequest(address,address,address,bytes32,uint256,uint256)',
} as const;

// Query new DB tables for data assembly
interface PoolContext {
    slot: string;
    currency: string;
    currencySymbol: string;
    currencyDecimals: number;
    sftSymbol: string;
    tokenDecimals: number;
}

// Best-effort: returns defaults if pool/currency tables have no data yet
// Optional existingPoolInfo avoids duplicate query when caller already fetched it (e.g. handleDeposit)
async function getPoolContext(chainId: number, poolId: string, existingPoolInfo?: BizPoolOrderSlotInfo | null): Promise<PoolContext> {
    const defaults: PoolContext = {
        slot: '',
        currency: '',
        currencySymbol: '',
        currencyDecimals: 18,
        sftSymbol: '',
        tokenDecimals: 18,
    };

    const poolInfo = existingPoolInfo !== undefined ? existingPoolInfo : await BizPoolOrderSlotInfo.findOne({
        where: {chainId, poolId},
    });
    if (!poolInfo) {
        console.warn('BasicSaleRedeemHandler: BizPoolOrderSlotInfo not found, writing with defaults', {chainId, poolId});
        return defaults;
    }

    defaults.slot = poolInfo.openFundShareSlot || '';
    defaults.currency = poolInfo.currency || '';

    if (poolInfo.currency) {
        const currencyInfo = await BizCurrencyInfo.findOne({
            where: {chainId, currencyAddress: poolInfo.currency.toLowerCase()},
        });
        if (currencyInfo) {
            defaults.currencySymbol = currencyInfo.symbol || '';
            defaults.currencyDecimals = currencyInfo.decimals ?? 18;
        }
    }

    if (poolInfo.openFundShare) {
        try {
            const metadata = await getErc20Metadata(chainId, poolInfo.openFundShare);
            defaults.sftSymbol = metadata.symbol;
            defaults.tokenDecimals = metadata.decimals;
        } catch (err) {
            console.warn('BasicSaleRedeemHandler: getErc20Metadata failed', {chainId, openFundShare: poolInfo.openFundShare, err});
        }
    }

    return defaults;
}

async function createBasicSaleRedeem(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    txHash: string;
    blockTimestamp: number;
    transactionIndex: number;
    eventIndex: number;
    fromAddress: string;
    toAddress: string;
    amount: string;
    transactionType: string;
    nav: string;
    poolId: string;
    blockNumber: number;
    slot: string;
    currencyAddress: string;
    currencySymbol: string;
    currencyDecimals: number;
    decimals: number;
    sftSymbol: string;
}): Promise<void> {
    await BasicSaleRedeem.findOrCreate({
        where: {
            txHash: params.txHash,
            transactionIndex: params.transactionIndex,
            eventIndex: params.eventIndex,
        },
        defaults: {
            chainId: params.chainId,
            contractAddress: params.contractAddress,
            tokenId: params.tokenId,
            txHash: params.txHash,
            blockTimestamp: params.blockTimestamp,
            transactionIndex: params.transactionIndex,
            eventIndex: params.eventIndex,
            fromAddress: params.fromAddress,
            toAddress: params.toAddress,
            amount: params.amount,
            decimals: params.decimals,
            currencyAddress: params.currencyAddress,
            currencySymbol: params.currencySymbol,
            currencyDecimals: params.currencyDecimals,
            slot: params.slot,
            transactionType: params.transactionType,
            productType: '',
            sftSymbol: params.sftSymbol,
            nav: params.nav,
            poolId: params.poolId,
            blockNumber: params.blockNumber,
            lastUpdated: params.blockTimestamp,
        },
    });
}

// ==================== OpenFundMarket events ====================

async function handleSubscribe(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId ?? args._poolId)?.toLowerCase();
    const buyer = toOptionalLowercaseAddress(args.buyer ?? args._buyer);
    const tokenId = toOptionalString(args.tokenId ?? args._tokenId) || ZERO_TOKEN_ID;
    const value = toOptionalString(args.value ?? args._value) || ZERO_AMOUNT;
    const nav = toOptionalString(args.nav ?? args._nav) || ZERO_AMOUNT;

    if (!poolId || !buyer) {
        console.warn('BasicSaleRedeemHandler: Subscribe missing required fields', {eventId: event.eventId});
        return;
    }

    const context = await getPoolContext(event.chainId, poolId);

    await createBasicSaleRedeem({
        chainId: event.chainId,
        contractAddress: event.contractAddress.toLowerCase(),
        tokenId,
        txHash: event.transactionHash,
        blockTimestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex || 0,
        eventIndex: event.logIndex || 0,
        fromAddress: event.contractAddress.toLowerCase(),
        toAddress: buyer,
        amount: value,
        transactionType: 'Sale',
        nav,
        poolId,
        blockNumber: event.blockNumber || 0,
        slot: context.slot,
        currencyAddress: context.currency,
        currencySymbol: context.currencySymbol,
        currencyDecimals: context.currencyDecimals,
        decimals: context.tokenDecimals,
        sftSymbol: context.sftSymbol,
    });
}

async function handleRequestRedeem(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId ?? args._poolId)?.toLowerCase();
    const owner = toOptionalLowercaseAddress(args.owner ?? args._owner);
    const redeemValue = toOptionalString(args.redeemValue ?? args._redeemValue) || ZERO_AMOUNT;
    const openFundShareId = toOptionalString(args.openFundShareId ?? args._openFundShareId) || ZERO_TOKEN_ID;

    if (!poolId || !owner) {
        console.warn('BasicSaleRedeemHandler: RequestRedeem missing required fields', {eventId: event.eventId});
        return;
    }

    const context = await getPoolContext(event.chainId, poolId);

    await createBasicSaleRedeem({
        chainId: event.chainId,
        contractAddress: event.contractAddress.toLowerCase(),
        tokenId: openFundShareId,
        txHash: event.transactionHash,
        blockTimestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex || 0,
        eventIndex: event.logIndex || 0,
        fromAddress: owner,
        toAddress: event.contractAddress.toLowerCase(),
        amount: redeemValue,
        transactionType: 'Redeem',
        nav: ZERO_AMOUNT,
        poolId,
        blockNumber: event.blockNumber || 0,
        slot: context.slot,
        currencyAddress: context.currency,
        currencySymbol: context.currencySymbol,
        currencyDecimals: context.currencyDecimals,
        decimals: context.tokenDecimals,
        sftSymbol: context.sftSymbol,
    });
}

// ==================== Router events ====================

async function handleCreateSubscription(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId ?? args._poolId)?.toLowerCase();
    const subscriber = toOptionalLowercaseAddress(args.subscriber ?? args._subscriber);
    const sftWrappedToken = toOptionalLowercaseAddress(args.sftWrappedToken ?? args._sftWrappedToken);
    const swtTokenAmount = toOptionalString(args.swtTokenAmount ?? args._swtTokenAmount) || ZERO_AMOUNT;

    if (!poolId || !subscriber || !sftWrappedToken) {
        console.warn('BasicSaleRedeemHandler: CreateSubscription missing required fields', {eventId: event.eventId});
        return;
    }

    const context = await getPoolContext(event.chainId, poolId);

    await createBasicSaleRedeem({
        chainId: event.chainId,
        contractAddress: event.contractAddress.toLowerCase(),
        tokenId: ZERO_TOKEN_ID,
        txHash: event.transactionHash,
        blockTimestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex || 0,
        eventIndex: event.logIndex || 0,
        fromAddress: sftWrappedToken,
        toAddress: subscriber,
        amount: swtTokenAmount,
        transactionType: 'Sale',
        nav: ZERO_AMOUNT,
        poolId,
        blockNumber: event.blockNumber || 0,
        slot: context.slot,
        currencyAddress: context.currency,
        currencySymbol: context.currencySymbol,
        currencyDecimals: context.currencyDecimals,
        decimals: context.tokenDecimals,
        sftSymbol: context.sftSymbol,
    });
}

async function handleCreateRedemption(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId ?? args._poolId)?.toLowerCase();
    const redeemer = toOptionalLowercaseAddress(args.redeemer ?? args._redeemer);
    const sftWrappedToken = toOptionalLowercaseAddress(args.sftWrappedToken ?? args._sftWrappedToken);
    const redemptionId = toOptionalString(args.redemptionId ?? args._redemptionId) || ZERO_TOKEN_ID;
    const redeemAmount = toOptionalString(args.redeemAmount ?? args._redeemAmount) || ZERO_AMOUNT;

    if (!poolId || !redeemer || !sftWrappedToken) {
        console.warn('BasicSaleRedeemHandler: CreateRedemption missing required fields', {eventId: event.eventId});
        return;
    }

    const context = await getPoolContext(event.chainId, poolId);

    await createBasicSaleRedeem({
        chainId: event.chainId,
        contractAddress: event.contractAddress.toLowerCase(),
        tokenId: redemptionId,
        txHash: event.transactionHash,
        blockTimestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex || 0,
        eventIndex: event.logIndex || 0,
        fromAddress: redeemer,
        toAddress: sftWrappedToken,
        amount: redeemAmount,
        transactionType: 'Redeem',
        nav: ZERO_AMOUNT,
        poolId,
        blockNumber: event.blockNumber || 0,
        slot: context.slot,
        currencyAddress: context.currency,
        currencySymbol: context.currencySymbol,
        currencyDecimals: context.currencyDecimals,
        decimals: context.tokenDecimals,
        sftSymbol: context.sftSymbol,
    });
}

// ==================== SolvBTCRouterV2 events ====================

async function handleDeposit(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolIds = args.poolIds as string[] | undefined;
    const poolId = poolIds?.length ? poolIds[poolIds.length - 1].toLowerCase() : undefined;
    const depositor = toOptionalLowercaseAddress(args.depositor);
    const targetToken = toOptionalLowercaseAddress(args.targetToken);
    const targetTokenAmount = toOptionalString(args.targetTokenAmount) || ZERO_AMOUNT;

    if (!poolId || !depositor || !targetToken) {
        console.warn('BasicSaleRedeemHandler: Deposit missing required fields', {eventId: event.eventId});
        return;
    }

    // Deposit: must check if poolOrderInfo exists to distinguish Sale vs Stake
    const poolInfo = await BizPoolOrderSlotInfo.findOne({where: {chainId: event.chainId, poolId}});
    if (!poolInfo) {
        // No poolOrderInfo → this is a Stake, not a Sale. Skip.
        return;
    }

    // Pass poolInfo to avoid duplicate query inside getPoolContext
    const context = await getPoolContext(event.chainId, poolId, poolInfo);

    await createBasicSaleRedeem({
        chainId: event.chainId,
        contractAddress: event.contractAddress.toLowerCase(),
        tokenId: ZERO_TOKEN_ID,
        txHash: event.transactionHash,
        blockTimestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex || 0,
        eventIndex: event.logIndex || 0,
        fromAddress: targetToken,
        toAddress: depositor,
        amount: targetTokenAmount,
        transactionType: 'Sale',
        nav: ZERO_AMOUNT,
        poolId,
        blockNumber: event.blockNumber || 0,
        slot: context.slot,
        currencyAddress: context.currency,
        currencySymbol: context.currencySymbol,
        currencyDecimals: context.currencyDecimals,
        decimals: context.tokenDecimals,
        sftSymbol: context.sftSymbol,
    });
}

async function handleWithdrawRequest(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId)?.toLowerCase();
    const requester = toOptionalLowercaseAddress(args.requester);
    const targetToken = toOptionalLowercaseAddress(args.targetToken);
    const redemptionId = toOptionalString(args.redemptionId) || ZERO_TOKEN_ID;
    const withdrawAmount = toOptionalString(args.withdrawAmount) || ZERO_AMOUNT;

    if (!poolId || !requester || !targetToken) {
        console.warn('BasicSaleRedeemHandler: WithdrawRequest missing required fields', {eventId: event.eventId});
        return;
    }

    const context = await getPoolContext(event.chainId, poolId);

    await createBasicSaleRedeem({
        chainId: event.chainId,
        contractAddress: event.contractAddress.toLowerCase(),
        tokenId: redemptionId,
        txHash: event.transactionHash,
        blockTimestamp: event.blockTimestamp,
        transactionIndex: event.transactionIndex || 0,
        eventIndex: event.logIndex || 0,
        fromAddress: requester,
        toAddress: targetToken,
        amount: withdrawAmount,
        transactionType: 'Redeem',
        nav: ZERO_AMOUNT,
        poolId,
        blockNumber: event.blockNumber || 0,
        slot: context.slot,
        currencyAddress: context.currency,
        currencySymbol: context.currencySymbol,
        currencyDecimals: context.currencyDecimals,
        decimals: context.tokenDecimals,
        sftSymbol: context.sftSymbol,
    });
}

// ==================== Exported handler functions ====================

export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {eventFunc, event, args} = param;

    await getBusinessSequelize();

    switch (eventFunc) {
        case EVENT_SIGNATURES.SUBSCRIBE:
            await handleSubscribe(event, args);
            return;
        case EVENT_SIGNATURES.REQUEST_REDEEM:
            await handleRequestRedeem(event, args);
            return;
        default:
            console.warn('BasicSaleRedeemHandler: unhandled OpenFundMarket event', {eventFunc, eventId: event.eventId});
    }
}

export async function handleRouterEvent(param: HandlerParam): Promise<void> {
    const {eventFunc, event, args} = param;

    await getBusinessSequelize();

    switch (eventFunc) {
        case EVENT_SIGNATURES.CREATE_SUBSCRIPTION:
            await handleCreateSubscription(event, args);
            return;
        case EVENT_SIGNATURES.CREATE_REDEMPTION:
            await handleCreateRedemption(event, args);
            return;
        default:
            console.warn('BasicSaleRedeemHandler: unhandled Router event', {eventFunc, eventId: event.eventId});
    }
}

export async function handleSolvBTCRouterV2Event(param: HandlerParam): Promise<void> {
    const {eventFunc, event, args} = param;

    await getBusinessSequelize();

    switch (eventFunc) {
        case EVENT_SIGNATURES.DEPOSIT:
            await handleDeposit(event, args);
            return;
        case EVENT_SIGNATURES.WITHDRAW_REQUEST:
            await handleWithdrawRequest(event, args);
            return;
        default:
            console.warn('BasicSaleRedeemHandler: unhandled SolvBTCRouterV2 event', {eventFunc, eventId: event.eventId});
    }
}
