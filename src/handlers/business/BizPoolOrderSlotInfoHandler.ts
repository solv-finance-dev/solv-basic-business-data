import {getBusinessSequelize} from '../../lib/dbClient';
import {toOptionalLowercaseAddress, toOptionalNumber, toOptionalString} from '../../lib/utils';
import type {HandlerParam} from '../../types/handler';
import BizCurrencyInfo from '../../models/business/BizCurrencyInfo';
import BizPoolOrderSlotInfo from '../../models/business/BizPoolOrderSlotInfo';

const EVENT_SIGNATURES = {
    CREATE_POOL: 'CreatePool(bytes32,address,address,((address,address,uint256,uint256),(uint16,address,uint64),(address,address,address),(uint256,uint256,uint256,uint64,uint64),address,address,address,uint64,bool,uint256))',
    REMOVE_POOL: 'RemovePool(bytes32)',
    UPDATE_POOL_INFO: 'UpdatePoolInfo(bytes32,uint16,address,uint256,uint256,address,address)',
    CREATE_SLOT: 'CreateSlot(uint256,address,bytes)',
} as const;

const POOL_STATUS = {
    ACTIVE: 'Active',
    REMOVE: 'Remove',
} as const;

interface PoolInfo {
    vault?: unknown;
    currency?: unknown;
    navOracle?: unknown;
    valueDate?: unknown;
    permissionless?: boolean;
    fundraisingAmount?: unknown;
    subscribeLimitInfo?: {
        hardCap?: unknown;
        subscribeMin?: unknown;
        subscribeMax?: unknown;
        fundraisingStartTime?: unknown;
        fundraisingEndTime?: unknown;
    };
    poolSFTInfo?: {
        openFundShare?: unknown;
        openFundRedemption?: unknown;
        openFundShareSlot?: unknown;
        latestRedeemSlot?: unknown;
    };
    poolFeeInfo?: {
        carryRate?: unknown;
        carryCollector?: unknown;
        latestProtocolFeeSettleTime?: unknown;
    };
    managerInfo?: {
        poolManager?: unknown;
        subscribeNavManager?: unknown;
        redeemNavManager?: unknown;
    };
}

async function findByChainAndPoolId(chainId: number, poolId: string): Promise<BizPoolOrderSlotInfo | null> {
    return BizPoolOrderSlotInfo.findOne({
        where: {
            chainId,
            poolId,
        },
    });
}

async function findByChainAndSlot(chainId: number, slot: string): Promise<BizPoolOrderSlotInfo | null> {
    return BizPoolOrderSlotInfo.findOne({
        where: {
            chainId,
            openFundShareSlot: slot,
        },
    });
}

async function upsertByPoolId(
    chainId: number,
    poolId: string,
    payload: Partial<BizPoolOrderSlotInfo>,
): Promise<'created' | 'updated'> {
    const existing = await findByChainAndPoolId(chainId, poolId);
    if (existing) {
        await existing.update(payload);
        return 'updated';
    }

    await BizPoolOrderSlotInfo.create({
        chainId,
        poolId,
        ...payload,
    });
    return 'created';
}

async function upsertBySlot(
    chainId: number,
    slot: string,
    payload: Partial<BizPoolOrderSlotInfo>,
): Promise<'created' | 'updated'> {
    const existing = await findByChainAndSlot(chainId, slot);
    if (existing) {
        await existing.update(payload);
        return 'updated';
    }

    await BizPoolOrderSlotInfo.create({
        chainId,
        openFundShareSlot: slot,
        ...payload,
    });
    return 'created';
}

async function handleCreatePool(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId)?.toLowerCase();
    const poolInfo = args.poolInfo_ as PoolInfo | undefined;
    const slot = toOptionalString(poolInfo?.poolSFTInfo?.openFundShareSlot);
    if (!poolId || !poolInfo || !slot) {
        console.warn('BizPoolOrderSlotInfoHandler: CreatePool missing required fields', {
            poolId,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const action = await upsertBySlot(event.chainId, slot, {
        poolId,
        openFundShare: toOptionalLowercaseAddress(poolInfo.poolSFTInfo?.openFundShare),
        openFundRedemption: toOptionalLowercaseAddress(poolInfo.poolSFTInfo?.openFundRedemption),
        openFundShareSlot: slot,
        latestRedeemSlot: toOptionalString(poolInfo.poolSFTInfo?.latestRedeemSlot),
        carryRate: toOptionalString(poolInfo.poolFeeInfo?.carryRate),
        carryCollector: toOptionalLowercaseAddress(poolInfo.poolFeeInfo?.carryCollector),
        latestProtocolFeeSettleTime: toOptionalString(poolInfo.poolFeeInfo?.latestProtocolFeeSettleTime),
        poolManager: toOptionalLowercaseAddress(poolInfo.managerInfo?.poolManager),
        subscribeNavManager: toOptionalLowercaseAddress(poolInfo.managerInfo?.subscribeNavManager),
        redeemNavManager: toOptionalLowercaseAddress(poolInfo.managerInfo?.redeemNavManager),
        hardCap: toOptionalString(poolInfo.subscribeLimitInfo?.hardCap),
        subscribeMin: toOptionalString(poolInfo.subscribeLimitInfo?.subscribeMin),
        subscribeMax: toOptionalString(poolInfo.subscribeLimitInfo?.subscribeMax),
        fundraisingStartTime: toOptionalNumber(poolInfo.subscribeLimitInfo?.fundraisingStartTime),
        fundraisingEndTime: toOptionalNumber(poolInfo.subscribeLimitInfo?.fundraisingEndTime),
        vault: toOptionalLowercaseAddress(poolInfo.vault),
        currency: toOptionalLowercaseAddress(poolInfo.currency) || toOptionalLowercaseAddress(args.currency),
        navOracle: toOptionalLowercaseAddress(poolInfo.navOracle),
        valueDate: toOptionalNumber(poolInfo.valueDate),
        fundraisingAmount: toOptionalString(poolInfo.fundraisingAmount),
        permissionless: poolInfo.permissionless ?? false,
        poolStatus: POOL_STATUS.ACTIVE,
    });

    console.log('BizPoolOrderSlotInfoHandler: CreatePool ' + action + ' record for poolId ', poolId, ' slot ', slot, ' eventId ', event.eventId);
}

async function handleRemovePool(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId)?.toLowerCase();
    if (!poolId) {
        console.warn('BizPoolOrderSlotInfoHandler: RemovePool missing poolId', {
            eventId: event.eventId,
        });
        return;
    }

    const action = await upsertByPoolId(event.chainId, poolId, {
        poolStatus: POOL_STATUS.REMOVE,
    });

    console.log('BizPoolOrderSlotInfoHandler: RemovePool ' + action + ' record for poolId ', poolId, ' eventId ', event.eventId);
}

async function handleUpdatePoolInfo(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const poolId = toOptionalString(args.poolId)?.toLowerCase();
    if (!poolId) {
        console.warn('BizPoolOrderSlotInfoHandler: UpdatePoolInfo missing poolId', {
            eventId: event.eventId,
        });
        return;
    }

    const payload: Partial<BizPoolOrderSlotInfo> = {};
    if (args.newCarryRate !== undefined) {
        payload.carryRate = String(args.newCarryRate);
    }
    if (args.newCarryCollector !== undefined) {
        payload.carryCollector = String(args.newCarryCollector).toLowerCase();
    }
    if (args.newSubscribeMin !== undefined) {
        payload.subscribeMin = String(args.newSubscribeMin);
    }
    if (args.newSubscribeMax !== undefined) {
        payload.subscribeMax = String(args.newSubscribeMax);
    }
    if (args.newSubscribeNavManager !== undefined) {
        payload.subscribeNavManager = String(args.newSubscribeNavManager).toLowerCase();
    }
    if (args.newRedeemNavManager !== undefined) {
        payload.redeemNavManager = String(args.newRedeemNavManager).toLowerCase();
    }

    const action = await upsertByPoolId(event.chainId, poolId, payload);

    console.log('BizPoolOrderSlotInfoHandler: UpdatePoolInfo ' + action + ' record for poolId ', poolId, ' eventId ', event.eventId);
}

async function handleCreateSlot(event: HandlerParam['event'], args: HandlerParam['args']): Promise<void> {
    const slot = toOptionalString(args._slot ?? args.slot);
    if (!slot) {
        console.warn('BizPoolOrderSlotInfoHandler: CreateSlot missing slot', {
            eventId: event.eventId,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();
    const existing = await findByChainAndSlot(event.chainId, slot);

    const currencyInfo = existing?.currency ? await BizCurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            currencyAddress: existing.currency.toLowerCase(),
        },
    }) : null;

    const action = await upsertBySlot(event.chainId, slot, {
        openFundShare: contractAddress,
        openFundShareSlot: slot,
        currencySymbol: currencyInfo?.symbol,
        valueDate: existing?.valueDate,
        payoffDate: existing?.payoffDate ?? existing?.fundraisingEndTime,
        isInterestRateSet: existing?.isInterestRateSet ?? false,
    });

    console.log('BizPoolOrderSlotInfoHandler: CreateSlot ' + action + ' record for slot ', slot, ' eventId ', event.eventId);
}

export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {eventFunc, event, args} = param;

    await getBusinessSequelize();

    switch (eventFunc) {
        case EVENT_SIGNATURES.CREATE_POOL:
            await handleCreatePool(event, args);
            return;
        case EVENT_SIGNATURES.REMOVE_POOL:
            await handleRemovePool(event, args);
            return;
        case EVENT_SIGNATURES.UPDATE_POOL_INFO:
            await handleUpdatePoolInfo(event, args);
            return;
        default:
            console.warn('BizPoolOrderSlotInfoHandler: unhandled OpenFundMarket event signature', {
                eventFunc,
                eventId: event.eventId,
            });
    }
}

export async function handleOpenShareDelegateEvent(param: HandlerParam): Promise<void> {
    const {eventFunc, event, args} = param;

    if (eventFunc !== EVENT_SIGNATURES.CREATE_SLOT) {
        return;
    }

    await getBusinessSequelize();
    await handleCreateSlot(event, args);
}
