export interface SqsParam {
    chainId: number;
    queueKey: string;
    secretName?: string
    message: any;
}
