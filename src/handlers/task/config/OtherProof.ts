import {Op} from "sequelize";
import {getBusinessSequelize} from "../../../lib/dbClient";
import BizBabylonAddresses from "../../../models/business/BizBabylonAddresses";
import BizCurrencyInfo from "../../../models/business/BizCurrencyInfo";
import BizNonEvmVaultBalance from "../../../models/business/BizNonEvmVaultBalance";
import BizPoolOrderSlotInfo from "../../../models/business/BizPoolOrderSlotInfo";
import BizSolvBtcIssuances from "../../../models/business/BizSolvBtcIssuances";
import BizSolvBtcReserves from "../../../models/business/BizSolvBtcReserves";
import BizSolvBtcYTIssuances from "../../../models/business/BizSolvBtcYTIssuances";
import BizSolvBtcYTReserves from "../../../models/business/BizSolvBtcYTReserves";
import BusinessConfig from "../../../models/business/BusinessConfig";
import {sendSNS} from "../../../lib/sns";

// 定时更新提供其它的POR地址配置

// Type definitions
interface EvmDataItem {
    vaultAddress: string;
    chainId?: number;
    currencyAddress: string;
    currencySymbol: string;
    currencyDecimals: number;
}

interface ProofData {
    btc: string[];
    evm: EvmDataItem[];
    solana?: DepositTokenItem[];
    stellar?: DepositTokenItem[];
    lastUpdatedAt: string;
}

interface DepositTokenItem {
    vaultAddress: string;
    currencyAddress: string;
    currencySymbol: string;
    currencyDecimals: number;
}

interface PoolDataItem extends BizPoolOrderSlotInfo {
    currencyInfo?: BizCurrencyInfo;
}

interface EvmOutputItem {
    chainId: number;
    chainName: string;
    tokenAddress: string;
    decimals?: number;
}

interface NonEvmTokenInfo {
    tokenAddress: string;
    decimals?: number;
}

interface ChainData {
    evm: EvmOutputItem[];

    [chainName: string]: any; // Allow dynamic chain name properties (stellar, solana, etc.)
}

interface FinalProofData {
    SolvBTC: ChainData;
    xSolvBTC: ChainData;
    lastUpdatedAt: string;
}

const babylonBtcAddress = "bc1qxsuy93rr0mat8sdlzjuk86z6ajpr04634wfx04lcuerw7dj52k5q8k6qaq";

const otherXSolvBTCData: EvmDataItem[] = [
    {
        "vaultAddress": "0xE439B88BE869F883Dd6476a892830d4EaE2FDa80",
        "chainId": 56,
        "currencyAddress": "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
        "currencySymbol": "BTCB",
        "currencyDecimals": 18
    },
    {
        "vaultAddress": "0x3D13c5FF0f5fA3cdDDcF226e733D3B9F990cD935",
        "chainId": 5000,
        "currencyAddress": "0xc96de26018a54d51c097160568752c4e3bd6c364",
        "currencySymbol": "FBTC",
        "currencyDecimals": 8
    }
];

const otherSolvBTCInSolanaData: EvmDataItem[] = [
    {
        "vaultAddress": "EZzXKHYjpKgXaZ3vy3zqBzr2TsVHNWbJ3N4daTxNdfUQ",
        "currencyAddress": "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
        "currencySymbol": "cbBTC",
        "currencyDecimals": 8
    }
];

export async function handler(event: any) {
    console.log(JSON.stringify(event));
    try {
        await proofData();
    } catch (error) {
        console.log(`Other Proof exception: ${(error as any).toString()}`);
        await sendSNS(`${process.env.CONFIG_ENV!}: Other Proof exception: ${(error as any).toString()}`, process.env.CONFIG_ENV! + " Chainlink Proof定时任务发现异常 ");
    }
}

async function proofData() {
    await getBusinessSequelize();

    try {
        // Fetch all required data in parallel for better performance
        const [solvbtcData, solvbtcYTData, solvbtcBabylonData, rawPoolData, solanaDepositTokensAddress, solvbtcIssuances, solvbtcYTIssuances] = await Promise.all([
            BizSolvBtcReserves.findAll({
                where: {assetName: "BTC"}
            }),
            BizSolvBtcYTReserves.findAll({
                where: {
                    assetName: "BTC",
                    yieldType: {[Op.in]: ["Babylon"]}
                }
            }),
            BizBabylonAddresses.findAll(),
            BizPoolOrderSlotInfo.findAll({
                attributes: ["chainId", "subtype", "yieldType", "vault", "currency", "currencySymbol"],
                where: {
                    [Op.or]: [
                        {subtype: "FOF"},
                        {yieldType: "Babylon"},
                    ],
                },
            }) as Promise<BizPoolOrderSlotInfo[]>,
            BizNonEvmVaultBalance.findAll({
                attributes: ["chain", "vaultName", "vaultAddress", "tokenAddress", "currencySymbol", "tokenDecimals"],
                where: {
                    vaultName: {[Op.in]: ["SolvBTC", "xSolvBTC"]},
                    chain: {[Op.in]: ["solana", "stellar"]},
                    tokenAddress: {[Op.not]: null}
                }
            }) as Promise<BizNonEvmVaultBalance[]>,
            BizSolvBtcIssuances.findAll({
                attributes: ["chainId", "chainName", "tokenAddress", "decimals"],
                where: {
                    chainId: {[Op.ne]: null}
                }
            }) as Promise<BizSolvBtcIssuances[]>,
            BizSolvBtcYTIssuances.findAll({
                attributes: ["chainId", "chainName", "tokenAddress", "decimals"],
                where: {
                    yieldType: "Babylon",
                    chainId: {[Op.ne]: null}
                }
            }) as Promise<BizSolvBtcYTIssuances[]>,
        ]);

        const poolData = await attachCurrencyInfo(rawPoolData);

        // Debug logging
        console.log(`Found ${solvbtcData.length} SolvBTC reserves`);
        console.log(`Found ${solvbtcYTData.length} SolvBTC YT reserves`);
        console.log(`Found ${solvbtcBabylonData.length} Babylon addresses`);
        console.log(`Found ${poolData.length} pool data items`);
        console.log(`Found ${solanaDepositTokensAddress} pool data items`);

        // Log pool data details for debugging
        poolData.forEach((item, index) => {
            console.log(`Pool item ${index}:`, {
                chainId: item.chainId,
                subtype: item.subtype,
                yieldType: item.yieldType,
                hasCurrencyInfo: !!item.currencyInfo,
                vault: item.vault,
                currencyAddress: item.currencyInfo?.currencyAddress
            });
        });

        const depositTokenDataByChain = await buildDepositTokenData(solanaDepositTokensAddress);
        console.log("Deposit token entries by chain:", depositTokenDataByChain);

        // Process pool data
        const {solvBTCEvmData, xSolvBTCEvmData} = processPoolData(poolData);

        console.log(`Processed ${solvBTCEvmData.length} SolvBTC EVM items`);
        console.log(`Processed ${xSolvBTCEvmData.length} xSolvBTC EVM items`);

        const uniqueSolanaDepositTokens = getUniqueDepositTokensByVaultAndCurrency(
            depositTokenDataByChain.solana ?? [],
            otherSolvBTCInSolanaData
        );

        // Prepare SolvBTC data
        const solvBTCData: ProofData = {
            btc: solvbtcData.map(item => item.vaultAddress),
            evm: solvBTCEvmData,
            solana: uniqueSolanaDepositTokens,
            lastUpdatedAt: new Date().toISOString(),
        };

        // Prepare xSolvBTC data
        const babylonAddresses = solvbtcYTData
            .filter(item => item.yieldType === "Babylon")
            .map(item => item.vaultAddress)
            .filter(Boolean); // Filter out any undefined addresses

        const xSolvBTCData: ProofData = {
            btc: [...babylonAddresses, ...solvbtcBabylonData.map(item => item.btcAddress).filter(Boolean), babylonBtcAddress],
            evm: [...xSolvBTCEvmData, ...otherXSolvBTCData],
            stellar: depositTokenDataByChain.stellar ?? [],
            lastUpdatedAt: new Date().toISOString(),
        };

        // Process issuances data (only use issuances data, not original data)
        const {evmData: solvBTCEvmFromIssuances, chainData: solvBTCChainData} = processIssuances(solvbtcIssuances);
        const {evmData: xSolvBTCEvmFromIssuances, chainData: xSolvBTCChainData} = processIssuances(solvbtcYTIssuances);

        // Prepare new format data using only issuances data
        const solvBTCChainDataFormatted: ChainData = {
            evm: solvBTCEvmFromIssuances,
            ...solvBTCChainData,
        };

        const xSolvBTCChainDataFormatted: ChainData = {
            evm: xSolvBTCEvmFromIssuances,
            ...xSolvBTCChainData,
        };

        const finalData: FinalProofData = {
            SolvBTC: solvBTCChainDataFormatted,
            xSolvBTC: xSolvBTCChainDataFormatted,
            lastUpdatedAt: new Date().toISOString(),
        };

        await Promise.all([
            // Chaos
            updateBusinessConfig("solvbtc-addresses", solvBTCData),
            updateBusinessConfig("xsolvbtc-addresses", xSolvBTCData),
            // movement 链所需配置，之前chanson/nic
            updateBusinessConfig("solvbtc-xsolvbtc-tokens", finalData)
        ]);

        console.log("Successfully processed and uploaded chainlink data");

    } catch (error) {
        console.error("Chainlink proof error:", error);
        throw error; // Re-throw to trigger the main error handler
    }
}

function processIssuances(issuances: BizSolvBtcIssuances[] | BizSolvBtcYTIssuances[]): {
    evmData: EvmOutputItem[],
    chainData: Record<string, NonEvmTokenInfo>
} {
    const evmData: EvmOutputItem[] = [];
    const chainData: Record<string, NonEvmTokenInfo> = {};

    for (const issuance of issuances) {
        if (!issuance.chainId || !issuance.tokenAddress) {
            continue;
        }

        const chainId = issuance.chainId;
        const chainName = issuance.chainName || '';
        const tokenAddress = issuance.tokenAddress;
        const decimals = issuance.decimals;

        // If chainId >= 0, it's an EVM chain, add to evm array
        if (chainId >= 0) {
            evmData.push({
                chainId: chainId,
                chainName: chainName,
                tokenAddress: tokenAddress,
                decimals: decimals,
            });
        } else {
            // If chainId < 0, add as chainName: tokenInfo object (lowercase for consistency)
            if (chainName) {
                const normalizedChainName = chainName.toLowerCase();
                chainData[normalizedChainName] = {
                    tokenAddress: tokenAddress,
                    decimals: decimals,
                };
            }
        }
    }

    return {evmData, chainData};
}

function processPoolData(poolData: PoolDataItem[]): { solvBTCEvmData: EvmDataItem[], xSolvBTCEvmData: EvmDataItem[] } {
    const solvBTCEvmData: EvmDataItem[] = [];
    const xSolvBTCEvmData: EvmDataItem[] = [];

    console.log(`Processing ${poolData.length} pool data items...`);

    for (const item of poolData) {
        console.log(`Processing item:`, {
            chainId: item.chainId,
            subtype: item.subtype,
            yieldType: item.yieldType,
            vault: item.vault,
            currencyInfo: item.currencyInfo
        });

        // Skip items with missing required data
        if (!item.vault || !item.currencyInfo?.currencyAddress ||
            !item.currencyInfo?.symbol || item.currencyInfo?.decimals === undefined) {
            console.warn(`Skipping pool data item with missing required fields:`, {
                hasVault: !!item.vault,
                hasCurrencyAddress: !!item.currencyInfo?.currencyAddress,
                hasSymbol: !!item.currencyInfo?.symbol,
                hasDecimals: item.currencyInfo?.decimals !== undefined,
                item: item
            });
            continue;
        }

        const evmDataItem: EvmDataItem = {
            vaultAddress: item.vault,
            chainId: item.chainId || 0,
            currencyAddress: item.currencyInfo.currencyAddress,
            currencySymbol: item.currencyInfo.symbol,
            currencyDecimals: item.currencyInfo.decimals,
        };

        console.log(`Created EVM data item:`, evmDataItem);

        if (item.subtype === "FOF") {
            console.log(`Adding to SolvBTC EVM data (FOF type)`);
            solvBTCEvmData.push(evmDataItem);
        } else if (item.yieldType === "Babylon") {
            console.log(`Adding to xSolvBTC EVM data (Babylon type)`);
            xSolvBTCEvmData.push(evmDataItem);
        } else {
            console.warn(`Item doesn't match FOF or Babylon criteria:`, {
                subtype: item.subtype,
                yieldType: item.yieldType
            });
        }
    }

    console.log(`Final results: ${solvBTCEvmData.length} SolvBTC EVM items, ${xSolvBTCEvmData.length} xSolvBTC EVM items`);
    return {solvBTCEvmData, xSolvBTCEvmData};
}

async function attachCurrencyInfo(poolData: BizPoolOrderSlotInfo[]): Promise<PoolDataItem[]> {
    if (!poolData.length) {
        return [];
    }

    const currencyConditions = poolData
        .filter(item => item.chainId !== undefined && item.chainId !== null && item.currency)
        .map(item => ({
            chainId: item.chainId,
            currencyAddress: item.currency!.toLowerCase(),
        }));

    if (!currencyConditions.length) {
        return poolData as PoolDataItem[];
    }

    const currencies = await BizCurrencyInfo.findAll({
        attributes: ["chainId", "currencyAddress", "symbol", "decimals"],
        where: {
            [Op.or]: currencyConditions,
        },
    });

    const currencyMap = new Map<string, BizCurrencyInfo>();
    for (const currency of currencies) {
        if (currency.chainId !== undefined && currency.chainId !== null && currency.currencyAddress) {
            currencyMap.set(`${currency.chainId}:${currency.currencyAddress.toLowerCase()}`, currency);
        }
    }

    return poolData.map(item => {
        const key = item.chainId !== undefined && item.chainId !== null && item.currency
            ? `${item.chainId}:${item.currency.toLowerCase()}`
            : '';
        return Object.assign(item, {
            currencyInfo: key ? currencyMap.get(key) : undefined,
        });
    }) as PoolDataItem[];
}

async function buildDepositTokenData(
    vaultBalances: BizNonEvmVaultBalance[]
): Promise<Record<string, DepositTokenItem[]>> {
    if (!vaultBalances || vaultBalances.length === 0) {
        return {};
    }

    // Group by chain and build DepositTokenItem array
    const result: Record<string, DepositTokenItem[]> = {};

    vaultBalances.forEach(balance => {
        if (!balance.chain || !balance.vaultAddress || !balance.tokenAddress) {
            return;
        }

        const chain = balance.chain.toLowerCase();
        if (!result[chain]) {
            result[chain] = [];
        }

        result[chain].push({
            vaultAddress: balance.vaultAddress,
            currencyAddress: balance.tokenAddress,
            currencySymbol: balance.currencySymbol,
            currencyDecimals: balance.tokenDecimals,
        });
    });

    return result;
}

function getUniqueDepositTokensByVaultAndCurrency(
    ...itemsList: DepositTokenItem[][]
): DepositTokenItem[] {
    const uniqueMap = new Map<string, DepositTokenItem>();

    for (const items of itemsList) {
        for (const item of items) {
            const key = `${item.vaultAddress}+${item.currencyAddress}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        }
    }

    return Array.from(uniqueMap.values());
}

async function updateBusinessConfig(key: string, config: unknown): Promise<void> {
    const existing = await BusinessConfig.findOne({
        where: {key},
    });

    if (existing) {
        await existing.update({
            config,
            updatedAt: new Date(),
        });
        return;
    }

    await BusinessConfig.create({
        key,
        title: '[自动更新:OtherProof]' + key,
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}
