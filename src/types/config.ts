// EVM 链配置与配置文件结构定义。
export interface ChainRuntimeConfig {
    openFundMarketAddress?: string;
    navOracleAddress?: string;
    whitelistAddress?: string;
    isCrossChain?: boolean;
    saveSftWrappedTokenTimestamp?: Record<string, number>;
}

export interface ChainConfig {
    chainId: number;
    startBlockNumber: number;
    blockLimit?: number;
    delayBlock?: number;
    config?: ChainRuntimeConfig;
}

export interface EvmConfigFile {
    chains: ChainConfig[];
}
