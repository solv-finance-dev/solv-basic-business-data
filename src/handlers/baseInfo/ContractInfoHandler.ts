import type { HandlerParam } from '../../types/handler';
import { decodeEventParamsFromAbi } from '../../lib/abi';
import { getContractTypeByAddress, getErc20Metadata } from '../../lib/rpc';
import RawOptContractInfo from '../../models/RawOptContractInfo';
// import {RawOptContractInfo} from "@solvprotocol/models"; 

export async function handlePayableDelegateFactoryEvent(param: HandlerParam): Promise<void> {
    const { event, transaction } = param;
    const args = decodeEventParamsFromAbi('PayableDelegateFactory.json', event);
    const beaconProxy = String(args.beaconProxy ?? '');
    if (!beaconProxy) {
        return;
    }

    const existing = await RawOptContractInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress: beaconProxy,
        },
        transaction,
    });
    if (existing) {
        console.log('ContractInfoHandler: record already exists for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
        return;
    }

    const contractType = await getContractTypeByAddress(event.chainId, beaconProxy);
    if (!contractType || (contractType !== 'Open Fund Shares' && contractType !== 'Open Fund Redemptions')) {
        console.log('ContractInfoHandler: contractType is not valid ', contractType, ' beaconProxy ', beaconProxy, ' eventId ', event.eventId);
        return;
    }
    const { decimals, symbol, name } = await getErc20Metadata(event.chainId, beaconProxy);
    await RawOptContractInfo.create({
        chainId: event.chainId,
        contractAddress: beaconProxy,
        contractType,
        decimals,
        symbol,
        name,
        totalSupply: '0',
        lastUpdated: event.blockTimestamp,
    }, { transaction });

    console.log('ContractInfoHandler: created record for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
}