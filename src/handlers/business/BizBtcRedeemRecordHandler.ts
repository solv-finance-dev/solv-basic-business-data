import type {HandlerParam} from '../../types/handler';
import {getBusinessSequelize} from '../../lib/dbClient';
import BizBtcRedeemRecord from '../../models/business/BizBtcRedeemRecord';

export async function handleMainnetRedeemerEvent(param: HandlerParam): Promise<void> {
    const {event, args} = param;
    const burnHash = event.transactionHash;

    await getBusinessSequelize();

    const existing = await BizBtcRedeemRecord.findOne({
        where: {burnHash},
    });
    if (existing) {
        console.log('BizBtcRedeemRecordHandler: record already exists for burnHash ', burnHash);
        return;
    }

    const sender = String(args.sender ?? '').toLowerCase();
    const receiver = String(args.receiver ?? '').toLowerCase();

    await BizBtcRedeemRecord.create({
        chainId: event.chainId,
        tokenAddress: event.contractAddress,
        burnAmount: args.solvBTCAmount,
        burnHash,
        fromAddress: sender,
        receiver,
        withdrawAmount: args.btcAmount,
        state: 'Pending',
        btcTransferHash: '',
        withdrawTime: event.blockTimestamp,
        lastUpdated: event.blockTimestamp,
    });

    console.log('BizBtcRedeemRecordHandler: created record for burnHash ', burnHash, ' eventId ', event.eventId);
}
