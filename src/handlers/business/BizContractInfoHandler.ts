import type {HandlerParam} from '../../types/handler';
import {getErc3525TokenMetadata} from '../../lib/rpc';
import {getBusinessSequelize} from '../../lib/dbClient';
import BizContractInfo from '../../models/business/BizContractInfo';
import {getContractType} from '../../services/evmService';
import {sendQueueMessageDelay} from '../../lib/sqs';

export async function handlePayableDelegateFactoryEvent(param: HandlerParam): Promise<void> {
    const {event, args, transaction} = param;
    const beaconProxy = String(args.beaconProxy ?? '');
    if (!beaconProxy) {
        return;
    }

    await getBusinessSequelize();

    const contractAddress = beaconProxy.toLowerCase();

    const existing = await BizContractInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress,
        },
        transaction,
    });
    if (existing) {
        console.log('BizContractInfoHandler: record already exists for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
        return;
    }

    const contractType = await getContractType(event.chainId, beaconProxy);
    if (!contractType || (contractType !== 'Open Fund Shares' && contractType !== 'Open Fund Redemptions')) {
        console.log('BizContractInfoHandler: contractType is not valid ', contractType, ' beaconProxy ', beaconProxy, ' eventId ', event.eventId);
        return;
    }

    const {decimals, symbol, name, contractURI} = await getErc3525TokenMetadata(event.chainId, beaconProxy);

    const [contractInfo, created] = await BizContractInfo.findOrCreate({
        where: {
            chainId: event.chainId,
            contractAddress,
        },
        defaults: {
            contractType,
            decimals,
            symbol,
            name,
            totalSupply: '0',
            lastUpdated: event.blockTimestamp,
            contractURI,
        },
        transaction,
    });

    if (!created) {
        await contractInfo.update(
            {
                contractType,
                decimals,
                symbol,
                name,
                lastUpdated: event.blockTimestamp,
                contractURI,
            },
            {transaction},
        );
        console.log('BizContractInfoHandler: updated record for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
    } else {
        console.log('BizContractInfoHandler: created record for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
    }

    await sendQueueMessageDelay(contractInfo.chainId, 'configQueue', {
        source: 'V3_5_Raw_Contract_Info',
        data: {
            id: Number(contractInfo.id),
            chainId: String(contractInfo.chainId),
            contractAddress: contractInfo.contractAddress,
        },
    });
}
