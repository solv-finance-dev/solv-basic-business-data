// import {RawOptNavHistoryPool} from "@solvprotocol/models";
import RawOptNavHistoryPool from '../models/RawOptNavHistoryPool';
import {Op} from "sequelize";

export async function getSubscribeNav(poolId: string | undefined, timestamp: number, decimals?: number): Promise<string | undefined> {
    const subscribeNav = await RawOptNavHistoryPool.findOne({
        where: {
            navType: 'Investment',
            poolId,
            lastUpdated: {
                [Op.lte]: timestamp
            }
        },
        limit: 1,
        order: [['id', 'DESC']]
    });

    let nav;
    if (subscribeNav) {
        nav = subscribeNav.nav;
    } else {
        nav = resolveNav(decimals)
    }

    return nav;
}

export function resolveNav(decimals?: number): string | undefined {
    if (decimals === undefined || decimals === null) {
        return undefined;
    }

    if (decimals === 18) {
        return '1000000000000000000';
    }

    try {
        const navValue = BigInt(10) ** BigInt(decimals);
        return navValue.toString();
    } catch (error) {
        console.warn('resolveNav: failed to calculate nav', {decimals, error});
        return undefined;
    }
}
