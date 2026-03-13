import type {HandlerParam} from '../../types/handler';
import {CarryCollectorHistory} from "@solvprotocol/models";

// 处理 OpenFundMarket 的 CreatePool/UpdatePoolInfo 事件。
export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const {eventFunc, args, event, transaction} = param;

    let newCarryCollector = '';
    if (eventFunc == 'CreatePool(bytes32,address,address,((address,address,uint256,uint256),(uint16,address,uint64),(address,address,address),(uint256,uint256,uint256,uint64,uint64),address,address,address,uint64,bool,uint256))') {
        const poolInfo = args.poolInfo_ as { poolFeeInfo?: { carryCollector?: unknown }; } | undefined;
        const carryCollector = poolInfo?.poolFeeInfo?.carryCollector;
        newCarryCollector = carryCollector !== undefined ? String(carryCollector).toLowerCase() : '';
    } else if (eventFunc == 'UpdatePoolInfo(bytes32,uint16,address,uint256,uint256,address,address)') {
        newCarryCollector = args.newCarryCollector ? String(args.newCarryCollector).toLowerCase() : '';
    }

    if (!newCarryCollector) {
        return;
    }

    const existing = await CarryCollectorHistory.findOne({
        where: {
            chainId: event.chainId,
            carryCollector: newCarryCollector,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    await CarryCollectorHistory.create(
        {
            chainId: event.chainId,
            carryCollector: newCarryCollector,
            lastUpdated: event.blockTimestamp,
        },
        {transaction},
    );
    console.log('CarryCollectorHistoryHandler: created record for carryCollector ', newCarryCollector, ' eventId ', event.eventId);
}
