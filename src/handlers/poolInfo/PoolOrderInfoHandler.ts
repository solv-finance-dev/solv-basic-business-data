import type { HandlerParam } from '../../types/handler';
import type { Transaction } from 'sequelize';
import {RawOptPoolOrderInfo} from "@solvprotocol/models";
import {CurrencyInfo} from "@solvprotocol/models";
import {RawOptPoolSlotInfo} from "@solvprotocol/models";
import {RawOptRedeemSlotInfo} from "@solvprotocol/models";
import { getTransactionInfo } from '../../lib/rpc';
import { sendQueueMessage } from '../../lib/sqs';

// 常量定义
const POOL_STATUS = {
    ACTIVE: 'Active',
    REMOVE: 'Remove',
    CLOSE: 'Close',
    LOCKED: 'Locked',
} as const;

const DEFAULT_DECIMALS = 18;
const DEFAULT_DECIMAL_VALUE_18 = '1000000000000000000';

// 类型定义
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

// 大数运算辅助函数
function addBigInt(a: string | undefined | null, b: string | undefined | null): string {
    const aValue = a || '0';
    const bValue = b || '0';
    try {
        return (BigInt(aValue) + BigInt(bValue)).toString();
    } catch (error) {
        console.error('PoolOrderInfoHandler: BigInt addition failed', { a: aValue, b: bValue, error });
        return '0';
    }
}

// 安全转换为字符串（地址转小写）
function toAddressString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    return String(value).toLowerCase();
}

// 安全转换为字符串（非地址）
function toString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    return String(value);
}

// 安全转换为数字
function toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
}

// 获取货币精度
async function getCurrencyDecimals(
    chainId: number,
    currencyAddress: string,
    transaction: Transaction
): Promise<number> {
    try {
        const currencyInfo = await CurrencyInfo.findOne({
            where: {
                chainId,
                currencyAddress: currencyAddress.toLowerCase(),
            },
            transaction,
        });

        if (currencyInfo?.decimals !== undefined && currencyInfo.decimals !== null) {
            return currencyInfo.decimals;
        }
    } catch (error) {
        console.error('PoolOrderInfoHandler: Failed to get CurrencyInfo', {
            chainId,
            currencyAddress,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    return DEFAULT_DECIMALS;
}

// 计算初始NAV和平均成本
function calculateInitialValues(decimals: number): { allTimeHighRedeemNav: string; averageCost: string } {
    if (decimals === DEFAULT_DECIMALS) {
        return {
            allTimeHighRedeemNav: DEFAULT_DECIMAL_VALUE_18,
            averageCost: DEFAULT_DECIMAL_VALUE_18,
        };
    }

    const value = String(10 ** decimals);
    return {
        allTimeHighRedeemNav: value,
        averageCost: value,
    };
}

// 统一创建 RawOptPoolOrderInfo 并发送 SQS
async function createPoolOrderInfoAndSendSQS(
    createData: Parameters<typeof RawOptPoolOrderInfo.create>[0],
    chainId: number,
    transaction: Transaction
): Promise<RawOptPoolOrderInfo> {
    const poolOrderInfo = await RawOptPoolOrderInfo.create(createData, { transaction });

    // 创建成功后发送 SQS 消息
    if (poolOrderInfo && poolOrderInfo.id) {
        try {
            await sendQueueMessage(chainId, 'assetQueue', {
                source: 'V3_5_Raw_Pool_Order_Info',
                data: {
                    id: Number(poolOrderInfo.id),
                    chainId: String(chainId),
                    poolId: poolOrderInfo.poolId,
                },
            });
        } catch (error) {
            console.error('PoolOrderInfoHandler: Failed to send SQS message for new pool order info', {
                id: poolOrderInfo.id,
                chainId,
                poolId: poolOrderInfo.poolId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return poolOrderInfo;
}

// 统一更新 RawOptPoolOrderInfo 并发送 SQS
async function updatePoolOrderInfoAndSendSQS(
    poolOrderInfo: RawOptPoolOrderInfo,
    updateData: Parameters<typeof RawOptPoolOrderInfo.prototype.update>[0],
    transaction: Transaction
): Promise<void> {
    await poolOrderInfo.update(updateData, { transaction });

    // 确保 chainId 存在才发送 SQS
    if (poolOrderInfo.chainId !== undefined && poolOrderInfo.chainId !== null) {
        try {
            await sendQueueMessage(poolOrderInfo.chainId, 'assetQueue', {
                source: 'V3_5_Raw_Pool_Order_Info',
                data: {
                    id: Number(poolOrderInfo.id),
                    chainId: String(poolOrderInfo.chainId),
                    poolId: poolOrderInfo.poolId,
                },
            });
        } catch (error) {
            console.error('PoolOrderInfoHandler: Failed to send SQS message for updated pool order info', {
                id: poolOrderInfo.id,
                chainId: poolOrderInfo.chainId,
                poolId: poolOrderInfo.poolId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

// 根据poolId查找PoolOrderInfo（必须存在）
async function getPoolOrderInfo(
    chainId: number,
    poolId: string,
    transaction: Transaction
): Promise<RawOptPoolOrderInfo | null> {
    const existing = await RawOptPoolOrderInfo.findOne({
        where: {
            chainId,
            poolId,
        },
        transaction,
    });

    return existing;
}

// 处理 CreatePool 事件
async function handleCreatePool(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const poolId = toString(args.poolId)?.toLowerCase();
    if (!poolId) {
        console.warn('PoolOrderInfoHandler: CreatePool missing poolId', { eventId: event.eventId });
        return;
    }

    console.log('PoolOrderInfoHandler: evnt, args', event, args);

    const currency = toAddressString(args.currency);
    const sft = toAddressString(args.sft);
    const poolInfo = args.poolInfo_ as PoolInfo | undefined;

    if (!currency || !sft || !poolInfo) {
        console.warn('PoolOrderInfoHandler: CreatePool missing required fields', {
            eventId: event.eventId,
            poolId,
            hasCurrency: !!currency,
            hasSft: !!sft,
            hasPoolInfo: !!poolInfo,
        });
        return;
    }

    // 检查是否已存在
    const existing = await RawOptPoolOrderInfo.findOne({
        where: {
            chainId: event.chainId,
            poolId,
        },
        transaction,
    });

    if (existing) {
        console.log('PoolOrderInfoHandler: CreatePool record already exists', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    const txInfo = await getTransactionInfo(
        event.chainId,
        event.transactionHash
    );

    // 获取货币精度并计算初始值
    const decimals = await getCurrencyDecimals(event.chainId, currency, transaction);
    const { allTimeHighRedeemNav, averageCost } = calculateInitialValues(decimals);


    // 提取poolInfo中的各个字段
    const vault = toAddressString(poolInfo.vault);
    const poolCurrency = toAddressString(poolInfo.currency) || currency;
    const navOracle = toAddressString(poolInfo.navOracle);
    const valueDate = toNumber(poolInfo.valueDate);
    const permissionless = poolInfo.permissionless ?? false;
    const fundraisingAmount = toString(poolInfo.fundraisingAmount) || '0';

    const subscribeLimitInfo = poolInfo.subscribeLimitInfo;
    const hardCap = toString(subscribeLimitInfo?.hardCap);
    const subscribeMin = toString(subscribeLimitInfo?.subscribeMin);
    const subscribeMax = toString(subscribeLimitInfo?.subscribeMax);
    const fundraisingStartTime = toNumber(subscribeLimitInfo?.fundraisingStartTime);
    const fundraisingEndTime = toNumber(subscribeLimitInfo?.fundraisingEndTime);

    const poolSFTInfo = poolInfo.poolSFTInfo;
    const openFundShare = toAddressString(poolSFTInfo?.openFundShare);
    const openFundRedemption = toAddressString(poolSFTInfo?.openFundRedemption);
    const openFundShareSlot = toString(poolSFTInfo?.openFundShareSlot);
    const latestRedeemSlot = toString(poolSFTInfo?.latestRedeemSlot);

    const poolFeeInfo = poolInfo.poolFeeInfo;
    const carryRate = toString(poolFeeInfo?.carryRate);
    const carryCollector = toAddressString(poolFeeInfo?.carryCollector);
    const latestProtocolFeeSettleTime = toNumber(poolFeeInfo?.latestProtocolFeeSettleTime);

    const managerInfo = poolInfo.managerInfo;
    const poolManager = toAddressString(managerInfo?.poolManager);
    const subscribeNavManager = toAddressString(managerInfo?.subscribeNavManager);
    const redeemNavManager = toAddressString(managerInfo?.redeemNavManager);

    const msgSender = txInfo?.from || toAddressString(args.msgSender);

    // 创建PoolOrderInfo记录并发送 SQS
    try {
        await createPoolOrderInfoAndSendSQS(
            {
                chainId: event.chainId,
                msgSender: toAddressString(msgSender),
                contractAddress: sft.toLowerCase(),
                marketContractAddress: event.contractAddress,
                poolId,
                openFundShare,
                openFundRedemption,
                openFundShareSlot,
                latestRedeemSlot,
                carryRate,
                carryCollector,
                latestProtocolFeeSettleTime,
                poolManager,
                subscribeNavManager,
                redeemNavManager,
                hardCap,
                subscribeMax,
                subscribeMin,
                fundraisingStartTime,
                fundraisingEndTime,
                vault,
                currency: poolCurrency,
                navOracle,
                valueDate,
                permissionless,
                fundraisingAmount,
                poolStatus: POOL_STATUS.ACTIVE,
                txHash: event.transactionHash,
                totalValue: '0',
                averageCost,
                highWatermark: allTimeHighRedeemNav,
                lastUpdated: event.blockTimestamp,
            },
            event.chainId,
            transaction
        );

        console.log('PoolOrderInfoHandler: CreatePool success', {
            poolId,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: CreatePool failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 处理 RemovePool 事件
async function handleRemovePool(
    event: HandlerParam['event'],
    poolId: string,
    transaction: Transaction
): Promise<void> {
    const poolOrder = await getPoolOrderInfo(event.chainId, poolId, transaction);
    if (!poolOrder) {
        console.warn('PoolOrderInfoHandler: RemovePool pool not found', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    try {
        await updatePoolOrderInfoAndSendSQS(
            poolOrder,
            {
                poolStatus: POOL_STATUS.REMOVE,
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('PoolOrderInfoHandler: RemovePool success', {
            poolId,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: RemovePool failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 处理 UpdateFundraisingEndTime 事件
async function handleUpdateFundraisingEndTime(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    poolId: string,
    transaction: Transaction
): Promise<void> {
    const newEndTime = toNumber(args.newEndTime);
    if (newEndTime === undefined) {
        console.warn('PoolOrderInfoHandler: UpdateFundraisingEndTime missing newEndTime', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    const poolOrder = await getPoolOrderInfo(event.chainId, poolId, transaction);
    if (!poolOrder) {
        console.warn('PoolOrderInfoHandler: UpdateFundraisingEndTime pool not found', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    // 如果新结束时间小于当前时间，状态设为Close，否则设为Active
    const newStatus = newEndTime < event.blockTimestamp ? POOL_STATUS.CLOSE : POOL_STATUS.ACTIVE;

    try {
        await updatePoolOrderInfoAndSendSQS(
            poolOrder,
            {
                fundraisingEndTime: newEndTime,
                poolStatus: newStatus,
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('PoolOrderInfoHandler: UpdateFundraisingEndTime success', {
            poolId,
            newEndTime,
            newStatus,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: UpdateFundraisingEndTime failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 处理 Subscribe 事件
async function handleSubscribe(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    poolId: string,
    transaction: Transaction
): Promise<void> {
    const value = toString(args.value);
    const payment = toString(args.payment);

    if (!value || !payment) {
        console.warn('PoolOrderInfoHandler: Subscribe missing required fields', {
            poolId,
            eventId: event.eventId,
            hasValue: !!value,
            hasPayment: !!payment,
        });
        return;
    }

    const poolOrder = await getPoolOrderInfo(event.chainId, poolId, transaction);
    if (!poolOrder) {
        console.warn('PoolOrderInfoHandler: Subscribe pool not found', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    const currentTotalValue = poolOrder.totalValue || '0';
    const currentFundraisingAmount = poolOrder.fundraisingAmount || '0';

    try {
        await updatePoolOrderInfoAndSendSQS(
            poolOrder,
            {
                totalValue: addBigInt(currentTotalValue, value),
                fundraisingAmount: addBigInt(currentFundraisingAmount, payment),
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('PoolOrderInfoHandler: Subscribe success', {
            poolId,
            value,
            payment,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: Subscribe failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 处理 CloseRedeemSlot 事件
async function handleCloseRedeemSlot(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    poolId: string,
    transaction: Transaction
): Promise<void> {
    const newRedeemSlot = toString(args.newRedeemSlot);
    const previousRedeemSlot = toString(args.previousRedeemSlot);

    if (!newRedeemSlot) {
        console.warn('PoolOrderInfoHandler: CloseRedeemSlot missing newRedeemSlot', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    const poolOrder = await getPoolOrderInfo(event.chainId, poolId, transaction);
    if (!poolOrder) {
        console.warn('PoolOrderInfoHandler: CloseRedeemSlot pool not found', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    try {
        // 更新latestRedeemSlot并发送 SQS
        await updatePoolOrderInfoAndSendSQS(
            poolOrder,
            {
                latestRedeemSlot: newRedeemSlot,
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        // 如果存在previousRedeemSlot，更新其状态为Locked
        if (previousRedeemSlot && poolOrder.openFundRedemption) {
            const redeemSlot = await RawOptRedeemSlotInfo.findOne({
                where: {
                    chainId: event.chainId,
                    contractAddress: poolOrder.openFundRedemption,
                    slot: previousRedeemSlot,
                },
                transaction,
            });

            if (redeemSlot) {
                await redeemSlot.update(
                    {
                        state: POOL_STATUS.LOCKED,
                        lastUpdated: event.blockTimestamp,
                    },
                    { transaction }
                );
            }
        }

        console.log('PoolOrderInfoHandler: CloseRedeemSlot success', {
            poolId,
            newRedeemSlot,
            previousRedeemSlot,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: CloseRedeemSlot failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 处理 UpdatePoolInfo 事件
async function handleUpdatePoolInfo(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    poolId: string,
    transaction: Transaction
): Promise<void> {
    const newCarryRate = toString(args.newCarryRate);
    const newCarryCollector = toAddressString(args.newCarryCollector);
    const newSubscribeMin = toString(args.newSubscribeMin);
    const newSubscribeMax = toString(args.newSubscribeMax);
    const newSubscribeNavManager = toAddressString(args.newSubscribeNavManager);
    const newRedeemNavManager = toAddressString(args.newRedeemNavManager);

    const poolOrder = await getPoolOrderInfo(event.chainId, poolId, transaction);
    if (!poolOrder) {
        console.warn('PoolOrderInfoHandler: UpdatePoolInfo pool not found', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    const updateData: Partial<RawOptPoolOrderInfo> = {
        lastUpdated: event.blockTimestamp,
    };

    if (newCarryRate !== undefined) {
        updateData.carryRate = newCarryRate;
    }
    if (newCarryCollector !== undefined) {
        updateData.carryCollector = newCarryCollector;
    }
    if (newSubscribeMin !== undefined) {
        updateData.subscribeMin = newSubscribeMin;
    }
    if (newSubscribeMax !== undefined) {
        updateData.subscribeMax = newSubscribeMax;
    }
    if (newSubscribeNavManager !== undefined) {
        updateData.subscribeNavManager = newSubscribeNavManager;
    }
    if (newRedeemNavManager !== undefined) {
        updateData.redeemNavManager = newRedeemNavManager;
    }

    try {
        await updatePoolOrderInfoAndSendSQS(poolOrder, updateData, transaction);

        console.log('PoolOrderInfoHandler: UpdatePoolInfo success', {
            poolId,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: UpdatePoolInfo failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 事件签名常量
const EVENT_SIGNATURES = {
    CREATE_POOL: 'CreatePool(bytes32,address,address,((address,address,uint256,uint256),(uint16,address,uint64),(address,address,address),(uint256,uint256,uint256,uint64,uint64),address,address,address,uint64,bool,uint256))',
    REMOVE_POOL: 'RemovePool(bytes32)',
    UPDATE_FUNDRAISING_END_TIME: 'UpdateFundraisingEndTime(bytes32,uint64,uint64)',
    SUBSCRIBE: 'Subscribe(bytes32,address,uint256,uint256,address,uint256,uint256)',
    CLOSE_REDEEM_SLOT: 'CloseRedeemSlot(bytes32,uint256,uint256)',
    UPDATE_POOL_INFO: 'UpdatePoolInfo(bytes32,uint16,address,uint256,uint256,address,address)',
} as const;

// 主处理函数
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const { eventFunc, event, args, transaction } = param;

    // 验证poolId
    const poolId = toString(args.poolId)?.toLowerCase();
    if (!poolId) {
        console.warn('PoolOrderInfoHandler: missing poolId', {
            eventId: event.eventId,
            eventFunc,
        });
        return;
    }

    try {
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case EVENT_SIGNATURES.CREATE_POOL:
                await handleCreatePool(event, args, transaction);
                break;

            case EVENT_SIGNATURES.REMOVE_POOL:
                await handleRemovePool(event, poolId, transaction);
                break;

            case EVENT_SIGNATURES.UPDATE_FUNDRAISING_END_TIME:
                await handleUpdateFundraisingEndTime(event, args, poolId, transaction);
                break;

            case EVENT_SIGNATURES.SUBSCRIBE:
                await handleSubscribe(event, args, poolId, transaction);
                break;

            case EVENT_SIGNATURES.CLOSE_REDEEM_SLOT:
                await handleCloseRedeemSlot(event, args, poolId, transaction);
                break;

            case EVENT_SIGNATURES.UPDATE_POOL_INFO:
                await handleUpdatePoolInfo(event, args, poolId, transaction);
                break;

            default:
                console.warn('PoolOrderInfoHandler: unhandled event signature', {
                    eventFunc,
                    poolId,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('PoolOrderInfoHandler: handleOpenFundMarketEvent failed', {
            eventFunc,
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        // 重新抛出错误，让上层处理
        throw error;
    }
}

// 处理 UpdateAllTimeHighRedeemNav 事件
async function handleUpdateAllTimeHighRedeemNav(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    poolId: string,
    transaction: Transaction
): Promise<void> {
    const newNav = toString(args.newNav);
    if (!newNav) {
        console.warn('PoolOrderInfoHandler: UpdateAllTimeHighRedeemNav missing newNav', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    const poolOrder = await getPoolOrderInfo(event.chainId, poolId, transaction);
    if (!poolOrder) {
        console.warn('PoolOrderInfoHandler: UpdateAllTimeHighRedeemNav pool not found', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    try {
        await updatePoolOrderInfoAndSendSQS(
            poolOrder,
            {
                highWatermark: newNav,
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('PoolOrderInfoHandler: UpdateAllTimeHighRedeemNav success', {
            poolId,
            newNav,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: UpdateAllTimeHighRedeemNav failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// Oracle事件签名常量
const ORACLE_EVENT_SIGNATURES = {
    UPDATE_ALL_TIME_HIGH_REDEEM_NAV: 'UpdateAllTimeHighRedeemNav(bytes32,uint256,uint256)',
} as const;

export async function handleOracleEvent(param: HandlerParam): Promise<void> {
    const { eventFunc, event, args, transaction } = param;

    const poolId = toString(args.poolId)?.toLowerCase();
    if (!poolId) {
        console.warn('PoolOrderInfoHandler: handleOracleEvent missing poolId', {
            eventId: event.eventId,
            eventFunc,
        });
        return;
    }

    try {
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case ORACLE_EVENT_SIGNATURES.UPDATE_ALL_TIME_HIGH_REDEEM_NAV:
                await handleUpdateAllTimeHighRedeemNav(event, args, poolId, transaction);
                break;

            default:
                console.warn('PoolOrderInfoHandler: unhandled oracle event signature', {
                    eventFunc,
                    poolId,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('PoolOrderInfoHandler: handleOracleEvent failed', {
            eventFunc,
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 处理 SetWhitelist 事件
async function handleSetWhitelist(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    poolId: string,
    transaction: Transaction
): Promise<void> {
    const permissionless = args.permissionless;
    if (permissionless === undefined || permissionless === null) {
        console.warn('PoolOrderInfoHandler: SetWhitelist missing permissionless', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    const poolOrder = await getPoolOrderInfo(event.chainId, poolId, transaction);
    if (!poolOrder) {
        console.warn('PoolOrderInfoHandler: SetWhitelist pool not found', {
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    try {
        await updatePoolOrderInfoAndSendSQS(
            poolOrder,
            {
                permissionless: Boolean(permissionless),
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('PoolOrderInfoHandler: SetWhitelist success', {
            poolId,
            permissionless: Boolean(permissionless),
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolOrderInfoHandler: SetWhitelist failed', {
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// Whitelist事件签名常量
const WHITELIST_EVENT_SIGNATURES = {
    SET_WHITELIST: 'SetWhitelist(bytes32,bytes32,bool)',
} as const;

export async function handleWhitelistEvent(param: HandlerParam): Promise<void> {
    const { eventFunc, event, args, transaction } = param;

    const poolId = toString(args.poolId)?.toLowerCase();
    if (!poolId) {
        console.warn('PoolOrderInfoHandler: handleWhitelistEvent missing poolId', {
            eventId: event.eventId,
            eventFunc,
        });
        return;
    }

    try {
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case WHITELIST_EVENT_SIGNATURES.SET_WHITELIST:
                await handleSetWhitelist(event, args, poolId, transaction);
                break;

            default:
                console.warn('PoolOrderInfoHandler: unhandled whitelist event signature', {
                    eventFunc,
                    poolId,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('PoolOrderInfoHandler: handleWhitelistEvent failed', {
            eventFunc,
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}