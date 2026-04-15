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

// 判断稳定币
export function isStablecoin(symbol: string): boolean {
    let stablecoinList = ["USDC", "USDT", "BUSD", "DAI", "GUSD", "HUSD"];

    return stablecoinList.indexOf(symbol) != -1;
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

export function toOptionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    return String(value);
}

export function toOptionalLowercaseAddress(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    return String(value).toLowerCase();
}

export function toOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? undefined : numericValue;
}
