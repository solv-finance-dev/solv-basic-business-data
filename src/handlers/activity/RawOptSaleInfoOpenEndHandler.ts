import {CurrencyInfo} from "@solvprotocol/models";
import {RawOptSaleInfoOpenEnd} from "@solvprotocol/models";
import {sendQueueMessageDelay} from '../../lib/sqs';
import {HandlerParam} from "../../types/handler";
import {RouterContractInfo, OptRawNavHistoryPool} from "@solvprotocol/models";
import {Op} from "sequelize";
import {getSubscribeNav} from "../../services/activityService";

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

    const nav= await getSubscribeNav(poolId, event.blockTimestamp, currencyInfo?.decimals);
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

    const nav = await getSubscribeNav(poolId, event.blockTimestamp, currencyInfo?.decimals);
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

    await sendQueueMessageDelay(event.chainId, 'activityQueue', {
        source: 'V3_5_Raw_Sale_Info_Open_End',
        data: {
            id: Number(created.id),
            chainId: String(event.chainId),
            contractAddress: poolId,
        },
    });

    console.log('RawOptSaleInfoOpenEndHandler: created record for txHash ', event.transactionHash, ' eventId ', event.eventId);
}
