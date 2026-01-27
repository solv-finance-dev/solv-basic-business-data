import type {HandlerParam} from '../../types/handler';
import {decodeEventParamsFromAbi} from '../../lib/abi';
import BtcRedeemRecord from '../../models/BondCurrencyInfo';
// import {BtcRedeemRecord} from "@solvprotocol/models";

export async function handleSetCurrencyEvent(param: HandlerParam): Promise<void> {
    const {event, transaction} = param;

    const args = decodeEventParamsFromAbi('MainnetRedeemer.json', event);

}