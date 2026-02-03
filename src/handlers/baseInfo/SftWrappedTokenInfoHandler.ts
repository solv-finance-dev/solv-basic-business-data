import type { HandlerParam } from '../../types/handler';
import { getErc20Metadata } from '../../services/evmService';
import SftWrappedTokenInfo from '../../models/SftWrappedTokenInfo';

// Handle SftWrappedTokenFactory events.
export async function handleSftWrappedTokenFactoryEvent(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const sftWrappedToken = args.sftWrappedToken !== undefined ? String(args.sftWrappedToken).toLowerCase() : '';
    if (!sftWrappedToken) {
        return;
    }

    const existing = await SftWrappedTokenInfo.findOne({
        where: {
            chainId: event.chainId,
            tokenAddress: sftWrappedToken,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    const wrappedSft = args.wrappedSft !== undefined ? String(args.wrappedSft).toLowerCase() : undefined;
    const wrappedSftSlot = args.wrappedSftSlot !== undefined ? String(args.wrappedSftSlot) : undefined;
    const name = args.name !== undefined ? String(args.name) : undefined;
    const symbol = args.symbol !== undefined ? String(args.symbol) : undefined;
    const navOracle = args.navOracle !== undefined ? String(args.navOracle).toLowerCase() : undefined;

    const metadata = await getErc20Metadata(event.chainId, sftWrappedToken);

    await SftWrappedTokenInfo.create(
        {
            chainId: event.chainId,
            sftAddress: wrappedSft ?? '',
            slot: wrappedSftSlot,
            tokenAddress: sftWrappedToken,
            name: name ?? '',
            symbol: symbol ?? '',
            decimals: metadata.decimals,
            navOracle: navOracle ?? '',
            isDefaultSlot: true,
        },
        { transaction },
    );

    console.log('SftWrappedTokenInfoHandler: created record for sftWrappedToken ', sftWrappedToken, ' eventId ', event.eventId);
}

async function upsertMultiAssetPoolToken(param: HandlerParam): Promise<void> {
    const { event, args, transaction } = param;

    const sft = args.sft !== undefined ? String(args.sft).toLowerCase() : '';
    const slot = args.slot !== undefined ? String(args.slot) : '';
    const tokenAddress = args.erc20 !== undefined ? String(args.erc20).toLowerCase() : '';
    if (!slot || !tokenAddress) {
        return;
    }

    const existing = await SftWrappedTokenInfo.findOne({
        where: {
            chainId: event.chainId,
            slot,
            tokenAddress,
        },
        transaction,
    });
    if (existing) {
        return;
    }

    const metadata = await getErc20Metadata(event.chainId, tokenAddress);

    await SftWrappedTokenInfo.create(
        {
            chainId: event.chainId,
            sftAddress: sft,
            slot,
            tokenAddress,
            name: metadata.name,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            navOracle: '',
            isDefaultSlot: false,
        },
        { transaction },
    );

    console.log('SftWrappedTokenInfoHandler: created record for erc20 ', tokenAddress, ' slot ', slot, ' eventId ', event.eventId);
}

// Handle SolvBTCMultiAssetPool events.
export async function handleSolvBTCMultiAssetPoolEvent(param: HandlerParam): Promise<void> {
    await upsertMultiAssetPoolToken(param);
}

// Handle SolvBTCYieldTokenMultiAssetPool events.
export async function handleSolvBTCYieldTokenMultiAssetPoolEvent(param: HandlerParam): Promise<void> {
    await upsertMultiAssetPoolToken(param);
}

