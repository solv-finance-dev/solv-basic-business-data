import {Sequelize} from 'sequelize';
import {initSequelize} from './db';

let cachedSequelize: Sequelize | null = null;
let lastInitTime: number | null = null; // 记录上次初始化的时间戳
const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10分钟的毫秒数

export async function getOrCreateSequelize(): Promise<Sequelize> {
    const now = Date.now();

    // 检查是否需要重新初始化：缓存为空 或 缓存已过期
    if (!cachedSequelize || (lastInitTime && now - lastInitTime > CACHE_EXPIRY_TIME)) {
        console.log('[DB] Creating new Sequelize instance (cold start or cache expired)');
        cachedSequelize = await initSequelize();
        lastInitTime = now; // 更新最后初始化时间
    } else {
        console.log('[DB] Reusing existing Sequelize instance (warm start)');
    }

    return cachedSequelize;
}
