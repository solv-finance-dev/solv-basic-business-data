import {createClient} from 'redis';
import {printLogEx} from '@solvprotocol/service-utils';

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
