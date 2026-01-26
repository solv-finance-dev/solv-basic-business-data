import type {HandlerParam} from '../../types/handler';
import {decodeEventParamsFromAbi} from '../../lib/abi';
import BtcRedeemRecord from '../../models/BtcRedeemRecord';

export async function handleRedeemEvent(param: HandlerParam): Promise<void> {
    const {event, transaction} = param;
    const burnHash = event.transactionHash;
    const existing = await BtcRedeemRecord.findOne({
        where: {burnHash},
        transaction,
    });
    if (existing) {
        console.log('BtcRedeemRecordHandler: record already exists for burnHash ', burnHash);
        return;
    }

    const args = decodeEventParamsFromAbi('MainnetRedeemer.json', event);

    await BtcRedeemRecord.create(
        {
            chainId: event.chainId,
            tokenAddress: event.contractAddress,
            burnAmount: args.solvBTCAmount,
            burnHash,
            fromAddress: args.sender,
            receiver: args.receiver,
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