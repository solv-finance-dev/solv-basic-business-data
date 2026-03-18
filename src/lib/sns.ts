import { publishSNSMessage } from '@solvprotocol/service-utils';

export async function sendSNS(message:string, subject:string | undefined) {
    if (!subject) {
        subject = process.env.CONFIG_ENV! + ': Basic-Business-Data Exception';
    }

    await publishSNSMessage(
        process.env.EXCEPTION_SNS_ARN!,
        message,
        subject,
        process.env.CDK_DEPLOY_REGION
    );
}