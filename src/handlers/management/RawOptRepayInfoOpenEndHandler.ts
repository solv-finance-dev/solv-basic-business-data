import type {HandlerParam} from '../../types/handler';
import {getContractType, getErc20Metadata} from '../../services/evmService';
import {CurrencyInfo} from "@solvprotocol/models";
import {RawOptRedeemSlotInfo} from "@solvprotocol/models";
import {RawOptRepayInfoOpenEnd} from "@solvprotocol/models";
import {RawOptPoolSlotInfo} from "@solvprotocol/models";
import { sendQueueMessageDelay } from '../../lib/sqs';

// Handle OpenFundRedemptionDelegate Repay event.
export async function handleOpenFundRedemptionDelegateEvent(param: HandlerParam): Promise<void> {
    const {event} = param;
    const contractType = await getContractType(event.chainId, event.contractAddress);
    if (contractType !== 'Open Fund Redemptions') {
        return;
    }

    await upsertRepayInfo(param, 'Normal');
}

// Handle OpenFundShareDelegate Repay event.
export async function handleOpenFundShareDelegateEvent(param: HandlerParam): Promise<void> {
    const {event} = param;
    const contractType = await getContractType(event.chainId, event.contractAddress);
    if (contractType !== 'Open Fund Shares') {
        return;
    }

    await upsertRepayInfo(param, 'Liquidation');
}

async function resolveCurrencySymbol(param: HandlerParam, repayType: 'Normal' | 'Liquidation'): Promise<string | undefined> {
    const {args, event, transaction} = param;
    const contractAddress = event.contractAddress.toLowerCase();
    let currencyAddress = '';
    let slotInfo;
    if (repayType == 'Normal') {
        slotInfo = await RawOptRedeemSlotInfo.findOne({
            where: {
                chainId: event.chainId,
                contractAddress,
                slot: args.slot !== undefined ? String(args.slot) : '',
            },
            transaction,
        });
    } else if (repayType == 'Liquidation') {
        slotInfo = await RawOptPoolSlotInfo.findOne({
            where: {
                chainId: event.chainId,
                contractAddress,
                slot: args.slot !== undefined ? String(args.slot) : '',
            },
            transaction,
        });
    }
    currencyAddress = slotInfo?.currencyAddress ? String(slotInfo.currencyAddress).toLowerCase() : '';
    if (!currencyAddress) {
        console.error('RawOptRepayInfoOpenEndHandler: currencyAddress not found for contract ', contractAddress, ' event.id ', event.id, ' repayType ', repayType);
        return undefined;
    }

    const currencyInfo = await CurrencyInfo.findOne({
        where: {
            chainId: event.chainId,
            currencyAddress,
        },
        transaction,
    });
    if (currencyInfo?.symbol) {
        return currencyInfo.symbol;
    }

    const metadata = await getErc20Metadata(event.chainId, currencyAddress);
    return metadata.symbol;
}

async function upsertRepayInfo(param: HandlerParam, repayType: 'Normal' | 'Liquidation'): Promise<void> {
    const {event, args, transaction} = param;

    const existing = await RawOptRepayInfoOpenEnd.findOne({
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

    const slot = args.slot !== undefined ? String(args.slot) : undefined;
    const address = args.payer !== undefined ? String(args.payer).toLowerCase() : undefined;
    const repayValue = args.repayCurrencyAmount !== undefined ? String(args.repayCurrencyAmount) : undefined;
    const currencySymbol = await resolveCurrencySymbol(param, repayType);

    const created = await RawOptRepayInfoOpenEnd.create(
        {
            chainId: event.chainId,
            slot,
            address,
            repaidValue: repayValue,
            repayDate: event.blockTimestamp,
            currencySymbol,
            txHash: event.transactionHash,
            transactionIndex: event.transactionIndex,
            eventIndex: event.logIndex,
            repayType,
            lastUpdated: event.blockTimestamp,
        },
        { transaction },
    );

    await sendQueueMessageDelay(event.chainId, 'assetQueue', {
        source: 'V3_5_Raw_Wrapped_Asset_Info',
        data: {
            id: Number(created.id),
            chainId: String(event.chainId),
            contractAddress: event.contractAddress,
        },
    });

    console.log('RawOptRepayInfoOpenEndHandler: created record for txHash ', event.transactionHash, ' eventId ', event.eventId);
}
