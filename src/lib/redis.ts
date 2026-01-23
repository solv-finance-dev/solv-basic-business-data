import {createClient} from 'redis';
import {printLogEx} from '@solvprotocol/service-utils';

type RedisClient = Awaited<ReturnType<typeof createRedisClient>>;

let redisClientPromise: Promise<RedisClient> | null = null;

export async function createRedisClient() {
    try {
        const client = createClient({
            url: process.env.REDIS_URL,
        });

        client.on('error', err => console.log('Redis Client Error', err));

        await client.connect();

        return client;
    } catch (err: any) {
        printLogEx({
            module: 'Redis',
            type: 'Except',
            bus: 'Handle',
            detail: err.toString(),
        });
        // await publishSNSMessage(
        // 	process.env.EXCEPTION_SNS_ARN!,
        // 	err.toString(),
        // 	process.env.CONFIG_ENV! + ': Redis Connection Error'
        // );
        throw new Error('Redis connection failed... ');
    }
}

// Shared redis client singleton for non-business modules.
export async function getRedisClient(): Promise<RedisClient> {
    if (!redisClientPromise) {
        redisClientPromise = createRedisClient();
    }

    return redisClientPromise;
}
