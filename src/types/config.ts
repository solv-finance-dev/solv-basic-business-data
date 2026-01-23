// EVM 链配置与配置文件结构定义。
export interface ChainConfig {
    chainId: number;
    startBlockNumber: number;
    blockLimit?: number;
}

export interface EvmConfigFile {
    chains: ChainConfig[];
}
