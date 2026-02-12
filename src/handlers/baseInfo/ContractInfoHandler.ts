import type { HandlerParam } from '../../types/handler';
import { getErc3525TokenMetadata } from '../../lib/rpc';
import RawOptContractInfo from '../../models/RawOptContractInfo';
import {getContractType} from "../../services/evmService";
// import {RawOptContractInfo} from "@solvprotocol/models"; 

export async function handlePayableDelegateFactoryEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;
    const beaconProxy = String(args.beaconProxy ?? '');
    if (!beaconProxy) {
        return;
    }

    const contractAddress = beaconProxy.toLowerCase();

    // 检查记录是否已存在
    const existing = await RawOptContractInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress,
        },
        transaction,
    });
    if (existing) {
        console.log('ContractInfoHandler: record already exists for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
        return;
    }

    const contractType = await getContractType(event.chainId, beaconProxy);
    if (!contractType || (contractType !== 'Open Fund Shares' && contractType !== 'Open Fund Redemptions')) {
        console.log('ContractInfoHandler: contractType is not valid ', contractType, ' beaconProxy ', beaconProxy, ' eventId ', event.eventId);
        return;
    }
    const { decimals, symbol, name, contractURI } = await getErc3525TokenMetadata(event.chainId, beaconProxy);
    
    // 使用 findOrCreate 避免唯一约束冲突
    const [contractInfo, created] = await RawOptContractInfo.findOrCreate({
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

    // 如果记录已存在，更新相关信息
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
            { transaction }
        );
        console.log('ContractInfoHandler: updated record for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
    } else {
        console.log('ContractInfoHandler: created record for beaconProxy ', beaconProxy, ' eventId ', event.eventId);
    }
}