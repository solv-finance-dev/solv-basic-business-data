import type {HandlerParam} from '../../types/handler';
import {XSolvBTCTransactionInfo} from "@solvprotocol/models";

// 处理 XSolvBTCPool 的 Deposit/Withdraw 事件。
export async function handleXSolvBTCPoolEvent(param: HandlerParam): Promise<void> {
    const {eventFunc, event, args, transaction} = param;

    const existing = await XSolvBTCTransactionInfo.findOne({
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

    const owner = args.owner !== undefined ? String(args.owner).toLowerCase() : '';
    const solvBTC = args.solvBTC !== undefined ? String(args.solvBTC).toLowerCase() : '';
    const xSolvBTC = args.xSolvBTC !== undefined ? String(args.xSolvBTC).toLowerCase() : '';
    const solvbtcAmount = args.solvBTCAmount !== undefined ? String(args.solvBTCAmount) : undefined;
    const xsolvbtcAmount = args.xSolvBTCAmount !== undefined ? String(args.xSolvBTCAmount) : undefined;

    let fromAddress = '';
    let toAddress = '';
    let transactionType = '';
    if (eventFunc == 'Deposit(address,address,address,uint256,uint256)') {
        transactionType = 'Deposit';
        fromAddress = owner;
        toAddress = xSolvBTC;
    } else if (eventFunc == 'Withdraw(address,address,address,uint256,uint256)') {
        transactionType = 'Withdraw';
        fromAddress = solvBTC;
        toAddress = owner;
    }

    await XSolvBTCTransactionInfo.create(
        {
            chainId: event.chainId,
            contractAddress: event.contractAddress,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber !== undefined ? String(event.blockNumber) : undefined,
            blockTimestamp: event.blockTimestamp,
            transactionIndex: event.transactionIndex,
            eventIndex: event.logIndex,
            fromAddress,
            toAddress,
            decimals: 18,
            transactionType,
            solvbtcAmount,
            xsolvbtcAmount,
            lastUpdated: event.blockTimestamp,
        },
        {transaction},
    );

    console.log('XSolvBTCTransactionInfoHandler: created record for txHash ', event.transactionHash, ' eventId ', event.eventId);
}
