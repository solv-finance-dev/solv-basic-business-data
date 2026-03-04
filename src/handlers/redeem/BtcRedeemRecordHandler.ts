import type {HandlerParam} from '../../types/handler';
import {BtcRedeemRecord} from "@solvprotocol/models";

export async function handleMainnetRedeemerEvent(param: HandlerParam): Promise<void> {
    const {event, args, transaction} = param;
    const burnHash = event.transactionHash;
    const existing = await BtcRedeemRecord.findOne({
        where: {burnHash},
        transaction,
    });
    if (existing) {
        console.log('BtcRedeemRecordHandler: record already exists for burnHash ', burnHash);
        return;
    }
    const sender = String(args.sender ?? '').toLowerCase();
    const receiver = String(args.receiver ?? '').toLowerCase();

    await BtcRedeemRecord.create(
        {
            chainId: event.chainId,
            tokenAddress: event.contractAddress,
            burnAmount: args.solvBTCAmount,
            burnHash,
            fromAddress: sender,
            receiver: receiver,
            withdrawAmount: args.btcAmount,
            state: 'Pending',
            btcTransferHash: '',
            withdrawTime: event.blockTimestamp,
            lastUpdated: event.blockTimestamp,
        },
        {transaction},
    );
    console.log('BtcRedeemRecordHandler: created record for burnHash ', burnHash, ' eventId ', event.eventId);
}