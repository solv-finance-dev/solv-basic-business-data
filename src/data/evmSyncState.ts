import { createRedisClient } from '../lib/redis';

type RedisClient = Awaited<ReturnType<typeof createRedisClient>>;

// 每条链的同步状态 Redis 前缀。
const KEY_PREFIX = process.env.EVM_SYNC_REDIS_PREFIX ?? 'evm:sync:last_block';
// 可选 TTL，用于在需要时避免陈旧键。
const TTL_SECONDS = Number(process.env.EVM_SYNC_REDIS_TTL_SECONDS ?? 0);

let redisClientPromise: Promise<RedisClient> | null = null;

async function getRedisClient(): Promise<RedisClient> {
	if (!redisClientPromise) {
		redisClientPromise = createRedisClient();
	}

	return redisClientPromise;
}

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

	if (TTL_SECONDS > 0) {
		await redisClient.setEx(key, TTL_SECONDS, value);
		return;
	}

	await redisClient.set(key, value);
}
