import CurrencyInfo from '../../models/CurrencyInfo';
import RawOptSaleInfoOpenEnd from '../../models/RawOptSaleInfoOpenEnd';
import {sendQueueMessage} from '../../lib/sqs';
import {HandlerParam} from "../../types/handler";
import {RouterContractInfo, OptRawNavHistoryPool} from "@solvprotocol/models";
import {Op} from "sequelize";

// 处理 OpenFundMarket 的 Subscribe 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {args, event, transaction} = param;
    const buyer = args.buyer !== undefined ? String(args.buyer).toLowerCase() : undefined;
    const routerContract = await RouterContractInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress: buyer
        }
    });

    if (routerContract) {
        console.log('RawOptSaleInfoOpenEndHandler: skip event from router contract ', args.buyer);
        return;
    }
    const poolId = args.poolId !== undefined ? String(args.poolId).toLowerCase() : undefined;
    const nav = args.nav !== undefined ? String(args.nav) : undefined;
    const currencyAddress = args.currency !== undefined ? String(args.currency).toLowerCase() : undefined;
    if (!currencyAddress) {
        console.error('RawOptSaleInfoOpenEndHandler: missing currency address in event ', event.id, ' args ', JSON.stringify(args));
        return;
    }

    const currencyInfo = await CurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            currencyAddress,
        },
        transaction,
    });

    const amount = args.value !== undefined ? String(args.value) : undefined;
    await handleSaleEvent(param, poolId, buyer, currencyInfo, nav, amount);
}

// 处理 SftWrappedRouter 的 CreateSubscription 事件。
export async function handleSftWrappedRouterEvent(param: HandlerParam): Promise<void> {
    const {args, event, transaction} = param;
    const poolId = args.poolId !== undefined ? String(args.poolId).toLowerCase() : undefined;
    const buyer = args.subscriber !== undefined ? String(args.subscriber).toLowerCase() : undefined;

    const currencyAddress = args.currency !== undefined ? String(args.currency).toLowerCase() : undefined;
    if (!currencyAddress) {
        console.error('RawOptSaleInfoOpenEndHandler: missing currency address in event ', event.id, ' args ', JSON.stringify(args));
        return;
    }

    const currencyInfo = await CurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            currencyAddress,
        },
        transaction,
    });

    const subscribeNav = await OptRawNavHistoryPool.findOne({
        where: {
            navType: 'Investment',
            poolId,
            lastUpdated: {
                [Op.lte]: event.blockTimestamp
            }
        },
        limit: 1,
        order: [['id', 'DESC']],
        transaction
    });

    let nav;
    if (subscribeNav) {
        nav = subscribeNav.nav;
    } else {
        nav = resolveNav(currencyInfo?.decimals)
    }

    const amount = args.swtTokenAmount !== undefined ? String(args.swtTokenAmount) : undefined;
    await handleSaleEvent(param, poolId, buyer, currencyInfo, nav, amount);
}

// 处理 SolvBTCRouterV2 的 Deposit 事件。
export async function handleSolvBTCRouterV2Event(param: HandlerParam): Promise<void> {
    const {args, event, transaction} = param;

    const poolIds = args.poolIds as string[] | undefined;
    const poolId = poolIds && poolIds.length > 0 ? String(poolIds[poolIds.length - 1]).toLowerCase() : undefined;
    const buyer = args.depositor !== undefined ? String(args.depositor).toLowerCase() : undefined;

    const currencyAddress = args.currency !== undefined ? String(args.currency).toLowerCase() : undefined;
    if (!currencyAddress) {
        console.error('RawOptSaleInfoOpenEndHandler: missing currency address in event ', event.id, ' args ', JSON.stringify(args));
        return;
    }

    const currencyInfo = await CurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            currencyAddress,
        },
        transaction,
    });


    const subscribeNav = await OptRawNavHistoryPool.findOne({
        where: {
            navType: 'Investment',
            poolId,
            lastUpdated: {
                [Op.lte]: event.blockTimestamp
            }
        },
        limit: 1,
        order: [['id', 'DESC']],
        transaction
    });

    let nav;
    if (subscribeNav) {
        nav = subscribeNav.nav;
    } else {
        nav = resolveNav(currencyInfo?.decimals)
    }

    const amount = args.targetTokenAmount !== undefined ? String(args.targetTokenAmount) : undefined;
    await handleSaleEvent(param, poolId, buyer, currencyInfo, nav, amount);
}

async function handleSaleEvent(
    param: HandlerParam,
    poolId: string | undefined,
    buyer: string | undefined,
    currencyInfo: CurrencyInfo | null,
    nav: string | undefined,
    amount: string | undefined
): Promise<void> {
    const {event, transaction} = param;

    const existing = await RawOptSaleInfoOpenEnd.findOne({
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

    const currencySymbol = currencyInfo?.symbol;

    const created = await RawOptSaleInfoOpenEnd.create(
        {
            chainId: event.chainId,
            poolId,
            txHash: event.transactionHash,
            transactionIndex: event.transactionIndex,
            eventIndex: event.logIndex,
            buyer,
            amount,
            currencySymbol,
            nav,
            blockTimestamp: event.blockTimestamp,
            lastUpdated: event.blockTimestamp,
        },
        {transaction},
    );

    await sendQueueMessage(event.chainId, 'activityQueue', {
        source: 'V3_5_Raw_Sale_Info_Open_End',
        data: {
            id: Number(created.id),
            chainId: String(event.chainId),
            contractAddress: poolId,
        },
    });

    console.log('RawOptSaleInfoOpenEndHandler: created record for txHash ', event.transactionHash, ' eventId ', event.eventId);
}

function resolveNav(decimals?: number): string | undefined {
    if (decimals === undefined || decimals === null) {
        return undefined;
    }

    if (decimals === 18) {
        return '1000000000000000000';
    }

    try {
        const navValue = BigInt(10) ** BigInt(decimals);
        return navValue.toString();
    } catch (error) {
        console.warn('RawOptSaleInfoOpenEndHandler: failed to calculate nav', {decimals, error});
        return undefined;
    }
}
