import fs from 'node:fs';
import path from 'node:path';

// 缓存配置，避免每次周期重复读盘。
const configCache = new Map<string, unknown>();

export function loadJsonConfig<T>(fileName: string): T {
    const filePath = resolveConfigPath(fileName);

    if (configCache.has(filePath)) {
        return configCache.get(filePath) as T;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as T;

    configCache.set(filePath, parsed);
    return parsed;
}

function resolveConfigPath(fileName: string): string {
    console.log('cwd:', process.cwd());
    console.log('files:', fs.readdirSync('/var/task'));
    const basePath = path.resolve(process.cwd(), 'config', fileName);
    if (fs.existsSync(basePath)) {
        return basePath;
    }

    const dottedPath = path.resolve(process.cwd(), 'config', `.${fileName}`);
    if (fs.existsSync(dottedPath)) {
        return dottedPath;
    }

    return basePath;
}

