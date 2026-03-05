import {sendSQSMessage} from '@solvprotocol/service-utils';
import {getSecretValue} from './secret';

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
    return {queueUrl, queueGroup};
}

// Send message to SQS by chainId and queueKey.
export async function sendQueueMessage(
    chainId: number,
    queueKey: string,
    message: unknown,
    secretName?: string
): Promise<void> {
    if (process.env.CONFIG_ENV === 'local') {
        console.error('SQS message skipped in local environment:', {chainId, queueKey, message});
        return;
    }
    const region = process.env.CDK_DEPLOY_REGION!;
    const resolvedSecretName = secretName ?? process.env.SECRET_V35_QUEUE_ID;
    if (!resolvedSecretName) {
        throw new Error('SQS: SECRET_V35_QUEUE_ID is not set.');
    }

    let queueUrl = '';
    let queueGroup = '';
    try {
        const queueConfig = await resolveQueueInfo(chainId, queueKey, resolvedSecretName, region);
        queueUrl = queueConfig.queueUrl;
        queueGroup = queueConfig.queueGroup;
    } catch (e) {
        console.error(`SQS: Failed to resolve queue info. chainId:${chainId},queueKey:${queueKey},error:${e}`);
        return;
    }

    // 将消息转换为 JSON 字符串，并验证其有效性
    let payload: string;
    if (typeof message === 'string') {
        // 如果已经是字符串，验证它是否是有效的 JSON
        try {
            const parsed = JSON.parse(message);
            // 重新序列化以确保格式一致（移除可能的空格和格式问题）
            payload = JSON.stringify(parsed);
        } catch (parseError) {
            // 如果不是有效的 JSON，将其作为普通字符串包装
            console.warn('SQS: Message is string but not valid JSON, wrapping it', {
                chainId,
                queueKey,
                messagePreview: message.substring(0, 100),
            });
            payload = JSON.stringify({ message });
        }
    } else {
        // 将对象转换为 JSON 字符串（使用紧凑格式，无空格）
        try {
            payload = JSON.stringify(message);
            // 验证生成的 JSON 是否有效
            const parsed = JSON.parse(payload);
            // 重新序列化以确保格式一致
            payload = JSON.stringify(parsed);
        } catch (stringifyError) {
            console.error('SQS: Failed to stringify message', {
                chainId,
                queueKey,
                error: stringifyError instanceof Error ? stringifyError.message : String(stringifyError),
                messageType: typeof message,
            });
            throw new Error(`SQS: Invalid message format for chainId ${chainId}, queueKey ${queueKey}`);
        }
    }

    // 记录发送的消息（仅记录前 200 个字符，避免日志过长）
    console.log('SQS: Sending message', {
        chainId,
        queueKey,
        queueUrl,
        queueGroup,
        payloadLength: payload.length,
        payloadPreview: payload.substring(0, 200),
    });

    try {
        await sendSQSMessage(queueUrl, queueGroup, payload, region);
        console.log('SQS: Message sent successfully', {
            chainId,
            queueKey,
            queueUrl,
            queueGroup,
        });
    } catch (sendError) {
        console.error('SQS: Failed to send message', {
            chainId,
            queueKey,
            queueUrl,
            queueGroup,
            payloadLength: payload.length,
            payloadPreview: payload.substring(0, 200),
            error: sendError instanceof Error ? sendError.message : String(sendError),
        });
        throw sendError;
    }
}
