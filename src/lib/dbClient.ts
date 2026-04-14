import {Sequelize} from 'sequelize';
import {initBasicSequelize, initBusinessSequelize} from './db';

let cachedBasicSequelize: Sequelize | null = null;
let lastBasicInitTime: number | null = null; // 记录上次初始化的时间戳
const CACHE_BASIC_EXPIRY_TIME = 10 * 60 * 1000; // 10分钟的毫秒数

// 获取基础业务数据库（目前对应的是raw_那个库，未来raw这些表会随着业务系统下线而下掉，后续功能迁移到下面 Business 库）
export async function getBasicSequelize(): Promise<Sequelize> {
    const now = Date.now();

    // 检查是否需要重新初始化：缓存为空 或 缓存已过期
    if (!cachedBasicSequelize || (lastBasicInitTime && now - lastBasicInitTime > CACHE_BASIC_EXPIRY_TIME)) {
        console.log('[DB] Creating new Basic Sequelize instance (cold start or cache expired)');
        cachedBasicSequelize = await initBasicSequelize();
        lastBasicInitTime = now; // 更新最后初始化时间
    } else {
        console.log('[DB] Reusing existing Basic Sequelize instance (warm start)');
    }

    return cachedBasicSequelize;
}

let cachedBusinessSequelize: Sequelize | null = null;
let lastBusinessInitTime: number | null = null; // 记录上次初始化的时间戳
const CACHE_BUSINESS_EXPIRY_TIME = 10 * 60 * 1000; // 10分钟的毫秒数

// 获取新的基础业务数据库
export async function getBusinessSequelize(): Promise<Sequelize> {
    const now = Date.now();

    // 检查是否需要重新初始化：缓存为空 或 缓存已过期
    if (!cachedBusinessSequelize || (lastBusinessInitTime && now - lastBusinessInitTime > CACHE_BUSINESS_EXPIRY_TIME)) {
        console.log('[DB] Creating new Business Sequelize instance (cold start or cache expired)');
        cachedBusinessSequelize = await initBusinessSequelize();
        lastBusinessInitTime = now; // 更新最后初始化时间
    } else {
        console.log('[DB] Reusing existing Business Sequelize instance (warm start)');
    }

    return cachedBusinessSequelize;
}