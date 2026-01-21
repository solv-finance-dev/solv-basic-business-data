import fs from 'node:fs';
import path from 'node:path';

// 缓存配置，避免每次周期重复读盘。
const configCache = new Map<string, unknown>();

export function loadJsonConfig<T>(fileName: string): T {
	if (configCache.has(fileName)) {
		return configCache.get(fileName) as T;
	}

	const filePath = path.resolve(process.cwd(), 'config', fileName);
	const raw = fs.readFileSync(filePath, 'utf8');
	const parsed = JSON.parse(raw) as T;

	configCache.set(fileName, parsed);
	return parsed;
}
