import { sendSQSMessage } from '@solvprotocol/service-utils';
import { getSecretValue } from './secret';

interface QueueConfig {
    QUEUE_URL: string;
    QUEUE_NAME: string;
    QUEUE_GROUP_ID: string;
}

type QueueConfigMap = Record<string, Record<string, QueueConfig>>;

const queueConfigCache = new Map<string, QueueConfigMap>();

// Load and cache queue config from Secrets Manager.
async function loadQueueConfig(secretName: string, region: string): Promise<QueueConfigMap> {
    const cached = queueConfigCache.get(secretName);
    if (cached) {
        return cached;
    }

    const secretString = await getSecretValue(secretName, region);
    if (!secretString) {
        throw new Error(`SQS: secret ${secretName} not found.`);
    }

    const parsed = JSON.parse(secretString) as QueueConfigMap;
    queueConfigCache.set(secretName, parsed);
    return parsed;
}

// Resolve queue url/group by chainId and queueKey.
async function resolveQueueInfo(
    chainId: number,
    queueKey: string,
    secretName: string,
    region: string
): Promise<{ queueUrl: string; queueGroup: string }> {
    const config = await loadQueueConfig(secretName, region);
    const chainConfig = config[String(chainId)];
    if (!chainConfig || !chainConfig[queueKey]) {
        throw new Error(`SQS: queue config not found for chainId ${chainId}, key ${queueKey}.`);
    }

    const queueUrl = chainConfig[queueKey].QUEUE_URL;
    const queueGroup = chainConfig[queueKey].QUEUE_GROUP_ID;
    return { queueUrl, queueGroup };
}

// Send message to SQS by chainId and queueKey.
export async function sendQueueMessage(
    chainId: number,
    queueKey: string,
    message: unknown,
    secretName?: string
): Promise<void> {
    const region = process.env.CDK_DEPLOY_REGION!;
    const resolvedSecretName = secretName ?? process.env.SECRET_V35_QUEUE_ID;
    if (!resolvedSecretName) {
        throw new Error('SQS: SECRET_V35_QUEUE_ID is not set.');
    }

    const { queueUrl, queueGroup } = await resolveQueueInfo(chainId, queueKey, resolvedSecretName, region);
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    await sendSQSMessage(queueUrl, queueGroup, payload, region);
}
