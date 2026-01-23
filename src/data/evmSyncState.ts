import {getRedisClient} from '../lib/redis';

// 每条链的同步状态 Redis 前缀。
const KEY_PREFIX = 'evm:sync:last_block';

function getKey(chainId: number): string {
    return `${KEY_PREFIX}:${chainId}`;
}

export async function getLastSyncedBlock(chainId: number): Promise<number | null> {
    const redisClient = await getRedisClient();
    const value = await redisClient.get(getKey(chainId));
    if (!value) {
        return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export async function setLastSyncedBlock(chainId: number, blockNumber: number): Promise<void> {
    const redisClient = await getRedisClient();
    const key = getKey(chainId);
    const value = String(blockNumber);

    await redisClient.set(key, value);
}
