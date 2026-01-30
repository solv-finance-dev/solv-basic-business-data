import {id} from "ethers";

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEnv(): string {
    const env = process.env.CONFIG_ENV ?? 'dev';
    if (env === 'dev' || env === 'test' || env === 'prod' || env === 'local') {
        return env;
    }
    return 'dev';
}

// 判断是否为 0x 开头的事件签名。
export function isHexSignature(signature: string): boolean {
    return signature.startsWith('0x') && signature.length === 66;
}

// 统一将事件签名转换为 0x 哈希格式。
export function eventSignature(signature: string | null | undefined): string {
    if (signature === undefined || signature === null) {
        return '';
    }
    if (signature === '') {
        return '';
    }
    if (isHexSignature(signature)) {
        return signature.toLowerCase();
    }
    return id(signature).toLowerCase();
}