import {Sequelize} from 'sequelize-typescript';
import {initBusinessSequelize} from './businessDb';

let cached: Sequelize | null = null;
let lastInitAt: number | null = null;
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 min, aligned with existing dbClient.ts

export async function getOrCreateBusinessSequelize(): Promise<Sequelize> {
    const now = Date.now();
    if (!cached || (lastInitAt && now - lastInitAt > CACHE_EXPIRY_MS)) {
        console.log('[BusinessDB] Creating new Sequelize instance');
        cached = await initBusinessSequelize();
        lastInitAt = now;
    }
    return cached;
}
