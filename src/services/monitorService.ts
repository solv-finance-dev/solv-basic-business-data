import path from 'node:path';
import {loadJsonConfig} from '../lib/config';
import {getEventByIds, getTemplateAddressesMap} from './evmService';
import {eventSignature, getEnv} from '../lib/utils';
import {EventEvm} from '../types/eventEvm';
import type {
    ChainMatcher,
    ContractMatcher,
    EventSignatureMap,
    EventSignaturesMatcher,
    HandlerEntry,
    HandlerFn,
    HandlerGroupConfig,
    HandlerParam,
    HandlerRuleConfig
} from '../types/handler';
import type {Transaction} from 'sequelize';
import {decodeEventFromAbi} from "../lib/abi";
import {getOrCreateSequelize} from "../lib/dbClient";
import {SqsParam} from "../types/sqsParam";

type TemplateAddressMap = Record<string, string[]>;

interface RouterEventConfig {
    name: string;
    handlerName?: string;
}

// 缓存 handler 函数，避免重复动态导入。
const handlerCache = new Map<string, HandlerFn>();
let handlerEntriesCache: HandlerEntry[] | null = null;

// 任务启动时调用，提前校验 handlers 配置。
export function initHandlersConfig(): void {
    if (!handlerEntriesCache) {
        handlerEntriesCache = loadHandlerEntries();
    }
}

// 将事件路由到匹配的 handler，互不阻塞。
export async function routerEvent(
    events: EventEvm[],
    templateAddressesMap: TemplateAddressMap,
    transaction: Transaction,
    handlerEntries?: HandlerEntry[]
): Promise<SqsParam[] | void> {
    if (!events.length) {
        console.warn('MonitorService: No events to route.');
        return;
    }

    if (handlerEntries && handlerEntries.length === 0) {
        console.warn('MonitorService: No handler entries provided for routing.');
        return;
    }

    const entries = handlerEntries ?? getHandlerEntries();
    if (!entries.length) {
        console.warn('MonitorService: No handlers configured.');
        return;
    }

    const sqsResults: SqsParam[] = [];
    for (const event of events) {
        const matchedHandlers = entries.filter((entry) => isEventMatch(event, entry, templateAddressesMap));
        if (!matchedHandlers.length) {
            console.warn('MonitorService: No handler matched event.', {
                id: event.id,
                chainId: event.chainId,
                eventSignature: event.eventSignature,
                contractAddress: event.contractAddress,
            });
            continue;
        }

        // 顺序执行每个 handler，而不是并发执行
        for (const entry of matchedHandlers) {
            let args = {};
            try {
                args = entry.abi ? decodeEventFromAbi(entry.abi, event) : {};
            } catch (e) {
                console.error("MonitorService: Failed to decode event with ABI for handler", entry.name, " event.id ", event.id, e);
                continue;
            }
            const eventSignatureKey = event.eventSignature.toLowerCase();
            const eventSignature = entry.eventSignatureMap ? entry.eventSignatureMap[eventSignatureKey] : '';
            try {
                const result = await invokeHandler(entry, {
                    event,
                    args,
                    eventFunc: eventSignature,
                    config: entry,
                    transaction
                });
                if (result) {
                    sqsResults.push(result);
                }
            } catch (error) {
                console.error(`MonitorService: Handler failed: ${entry.name}`, error);
                throw new Error('MonitorService: handler execution failed.');
            }
        }
    }

    if (sqsResults.length > 0) {
        return sqsResults;
    }
}

export async function routerEventByIds(
    ids: number[],
    config?: RouterEventConfig,
    transaction?: Transaction
): Promise<void> {
    const events = await getEventByIds(ids);
    if (!events.length) {
        return;
    }

    const chainIds = Array.from(new Set(events.map((event) => event.chainId)));
    if (chainIds.length !== 1) {
        throw new Error('MonitorService: routerEventByIds only supports single chain per call.');
    }

    const templateAddressesMap = await getTemplateAddressesMap(chainIds[0]);

    let handlerEntries: HandlerEntry[] | undefined;
    if (config) {
        handlerEntries = getHandlerEntriesByConfig(config);
        if (!handlerEntries.length) {
            console.warn('MonitorService: No handler entries matched config.', {
                name: config.name,
                handlerName: config.handlerName,
            });
            return;
        }
    }

    if (transaction) {
        await routerEvent(events, templateAddressesMap, transaction, handlerEntries);
        return;
    }

    const sequelize = await getOrCreateSequelize();
    const newTransaction = await sequelize.transaction();
    try {
        await routerEvent(events, templateAddressesMap, newTransaction, handlerEntries);
        await newTransaction.commit();
    } catch (error) {
        await newTransaction.rollback();
        throw error;
    }
}

function getHandlerEntries(): HandlerEntry[] {
    if (!handlerEntriesCache) {
        handlerEntriesCache = loadHandlerEntries();
    }

    return handlerEntriesCache;
}

function loadHandlerEntries(): HandlerEntry[] {
    const env = getEnv();
    const configFile = loadJsonConfig<HandlerGroupConfig[]>(`handlers.${env}.json`);
    if (!Array.isArray(configFile)) {
        throw new Error('MonitorService: handlers config should be an array.');
    }

    const entries: HandlerEntry[] = [];
    for (const group of configFile) {
        const groupEntries = normalizeGroup(group);
        entries.push(...groupEntries);
    }

    return entries;
}

function getHandlerEntriesByConfig(config: RouterEventConfig): HandlerEntry[] {
    const env = getEnv();
    const configFile = loadJsonConfig<HandlerGroupConfig[]>(`handlers.${env}.json`);
    if (!Array.isArray(configFile)) {
        throw new Error('MonitorService: handlers config should be an array.');
    }

    const group = configFile.find((item) => item.name === config.name);
    if (!group) {
        return [];
    }

    let handlers = group.handlers;
    if (config.handlerName) {
        handlers = handlers.filter((handler) => handler.handler === config.handlerName);
    }

    if (!handlers.length) {
        return [];
    }

    const filteredGroup: HandlerGroupConfig = {
        ...group,
        handlers,
    };

    return normalizeGroup(filteredGroup);
}

function normalizeGroup(group: HandlerGroupConfig): HandlerEntry[] {
    if (!group.name || !group.module) {
        throw new Error('MonitorService: handler group requires name and module.');
    }

    if (!Array.isArray(group.handlers) || !group.handlers.length) {
        throw new Error(`MonitorService: handler group ${group.name} has empty handlers.`);
    }

    return group.handlers.map((rule) => normalizeRule(group, rule));
}

function normalizeRule(group: HandlerGroupConfig, rule: HandlerRuleConfig): HandlerEntry {
    if (!rule || !rule.handler) {
        throw new Error(`MonitorService: handler rule missing handler in group ${group.name}.`);
    }

    if (rule.chainIds === undefined || rule.contractAddresses === undefined || rule.eventSignatures === undefined) {
        throw new Error(`MonitorService: handler rule must declare chainIds, contractAddresses, eventSignatures.`);
    }

    const hasChainIds = rule.chainIds !== null;
    const hasContracts = rule.contractAddresses !== null;
    const hasEventSignatures = rule.eventSignatures !== null;
    const hasTemplateSignature = rule.templateSignature !== null && rule.templateSignature !== undefined;
    if (!hasChainIds && !hasContracts && !hasEventSignatures && !hasTemplateSignature) {
        throw new Error(
            `MonitorService: handler rule ${rule.handler} must have at least one matcher value.`
        );
    }

    return {
        name: group.name,
        module: group.module,
        handlerName: rule.handler,
        abi: rule.abi,
        chainIds: normalizeChainIds(rule.chainIds),
        contractAddresses: normalizeAddresses(rule.contractAddresses),
        templateSignature: eventSignature(rule.templateSignature),
        eventSignatures: rule.eventSignatures,
        eventSignatureMap: toEventSignaturesMap(rule.eventSignatures),
    };
}

function normalizeChainIds(chainIds: ChainMatcher): ChainMatcher {
    if (chainIds === null) {
        return null;
    }

    if (!Array.isArray(chainIds)) {
        throw new Error('MonitorService: chainIds must be an array or null.');
    }

    return chainIds.map((chainId) => {
        const parsed = Number(chainId);
        if (!Number.isFinite(parsed)) {
            throw new Error(`MonitorService: invalid chainId value ${chainId}.`);
        }
        return parsed;
    });
}

function normalizeAddresses(addresses: ContractMatcher): ContractMatcher {
    if (addresses === null) {
        return null;
    }

    if (!Array.isArray(addresses)) {
        throw new Error('MonitorService: addresses must be an array or null.');
    }

    return addresses.map((address) => address.toLowerCase());
}

// 配置中的事件签名允许使用 ABI 字符串或 0x 哈希。
function toEventSignaturesMap(signatures: EventSignaturesMatcher): EventSignatureMap {
    if (signatures === null) {
        return null;
    }

    if (!Array.isArray(signatures)) {
        throw new Error('MonitorService: eventSignatures must be an array or null.');
    }

    return signatures.reduce<Record<string, string>>((acc, signature) => {
        const normalized = eventSignature(signature);
        acc[normalized] = signature;
        return acc;
    }, {});
}

function isEventMatch(event: EventEvm, config: HandlerEntry, templateAddressesMap: TemplateAddressMap): boolean {
    if (config.chainIds !== null) {
        if (!config.chainIds.length) {
            return false;
        }
        if (!config.chainIds.includes(event.chainId)) {
            return false;
        }
    }

    const target = event.contractAddress.toLowerCase();
    let contractMatched = true;
    if (config.contractAddresses !== null) {
        if (!config.contractAddresses.length && !config.templateSignature) {
            // 如果配置了空数组 且 templateSignature 也未配置，则不匹配任何数据直接退出。
            return false;
        }
        contractMatched = config.contractAddresses.includes(target);
    }

    if (!contractMatched) {
        if (!config.templateSignature) {
            return false;
        }
        const templateSignatureKey = eventSignature(config.templateSignature);
        const templateAddresses = templateAddressesMap[templateSignatureKey];
        if (!templateAddresses || !templateAddresses.includes(target)) {
            return false;
        }
    }

    if (config.eventSignatureMap !== null) {
        const keys = Object.keys(config.eventSignatureMap);
        if (!keys.length) {
            return false;
        }
        const eventSignature = event.eventSignature.toLowerCase();
        if (!config.eventSignatureMap[eventSignature]) {
            return false;
        }
    }

    return true;
}

async function invokeHandler(entry: HandlerEntry, param: HandlerParam): Promise<SqsParam | void> {
    const handler = await getHandlerFunction(entry);
    return await handler(param);
}

async function getHandlerFunction(entry: HandlerEntry): Promise<HandlerFn> {
    const cacheKey = `${entry.module}:${entry.handlerName}`;
    const cached = handlerCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // 从 src/handlers 动态解析并导入 handler 模块。
    const modulePath = resolveHandlerModulePath(entry.module);
    const importedModule = await import(modulePath);
    const handler = importedModule[entry.handlerName];

    if (typeof handler !== 'function') {
        throw new Error(`Handler function not found: ${entry.handlerName} in ${entry.module}`);
    }

    handlerCache.set(cacheKey, handler as HandlerFn);
    return handler as HandlerFn;
}

function resolveHandlerModulePath(moduleName: string): string {
    const baseDir = path.resolve(__dirname, '..');
    return path.resolve(baseDir, 'handlers', moduleName);
}
