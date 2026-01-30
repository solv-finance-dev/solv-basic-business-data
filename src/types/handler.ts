import type {Transaction} from 'sequelize';
import type {EventEvm} from './event';

export type HandlerFn = (param: HandlerParam) => Promise<void> | void;
export type ChainMatcher = number[] | null;
export type ContractMatcher = string[] | null;
export type EventSignaturesMatcher = string[] | null;
export type EventSignatureMap = Record<string, string> | null;

export interface HandlerRuleConfig {
    handler: string;
    abi: string;
    chainIds: ChainMatcher;
    contractAddresses: ContractMatcher;
    eventSignatures: EventSignaturesMatcher;
}

export interface HandlerGroupConfig {
    name: string;
    module: string;
    handlers: HandlerRuleConfig[];
}

export interface HandlerEntry {
    name: string;
    module: string;
    handlerName: string;
    abi: string;
    chainIds: ChainMatcher;
    contractAddresses: ContractMatcher;
    eventSignatures: EventSignaturesMatcher;
    eventSignatureMap: EventSignatureMap;
}

// Handler 参数：包含事件与同一事务上下文。
export interface HandlerParam {
    event: EventEvm;
    args: Record<string, unknown>;
    eventSignature: string;
    config: HandlerEntry;
    transaction: Transaction;
}
