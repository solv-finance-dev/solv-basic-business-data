import { getBalanceWithRetry, getDecimalsWithRetry } from "../../../lib/rpc";
import { Op } from "sequelize";
import {getBusinessSequelize} from "../../../lib/dbClient";
import {sendSNS} from "../../../lib/sns";
import BizBabylonAddresses from "../../../models/business/BizBabylonAddresses";
import BizSolvBtcReserves from "../../../models/business/BizSolvBtcReserves";
import BizSolvBtcYTReserves from "../../../models/business/BizSolvBtcYTReserves";
import BusinessConfig from "../../../models/business/BusinessConfig";

// 定时更新提供ChainLink的POR地址配置

const evmResult = {
    "bob": {
        "chainId": 60808,
        "vault": "0x33b7a7a164b77433a61d4b49bd780a2718812e6e",
        "tokens": [
            "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c"
        ],
    }
}

interface TokenInfo {
    tokenAddress: string;
    tokenBalance: string;
    tokenDecimal: string;
}

interface EVMResult {
    [key: string]: {
        chain_id: number;
        vault: string;
        tokens: TokenInfo[];
    };
}

interface BtcData {
    accountName: string;
    result: { id: number; address: string; symbol: string; addressType: string; walletName: string; }[];
    count: number;
    EVMresult?: EVMResult;
    lastUpdatedAt: string;
}

export async function handler(event: any) {
    console.log(JSON.stringify(event));
    try {
        await chainlink();
    } catch (error) {
        console.log(`Chainlink Proof exception: ${(error as any).toString()}`);
        await sendSNS(`${process.env.CONFIG_ENV!}: Chainlink Proof exception: ${(error as any).toString()}`, process.env.CONFIG_ENV! + " Chainlink Proof定时任务发现异常 ");
    }
}

async function chainlink() {
    await getBusinessSequelize();
    try {
        const solvbtcData = await BizSolvBtcReserves.findAll({
            where: {
                assetName: "BTC"
            }
        });
        const solvbtcYTData = await BizSolvBtcYTReserves.findAll({
            where: {
                assetName: "BTC",
                yieldType: {
                    [Op.in]: ["Babylon", "Ethena", "Core"]
                }
            }
        });
        const solvbtcBabylonData = await BizBabylonAddresses.findAll();

        console.log("solvbtcData", solvbtcData.length)
        console.log("solvbtcYTData", solvbtcYTData.length)

        const solvbtc = await btcData("SolvBTC", solvbtcData.map(item => item.vaultAddress) ?? []);
        await updateBusinessConfig("solv-btc-addresses", solvbtc)

        let solvbtcAddresses: { [key: string]: string[] } = {};
        for (const item of solvbtcYTData) {
            const yieldType = item.yieldType || '';
            if (!yieldType) {
                continue;
            }
            if (!solvbtcAddresses[yieldType]) {
                solvbtcAddresses[yieldType] = [];
            }
            solvbtcAddresses[yieldType].push(item.vaultAddress);
        }
        if (!solvbtcAddresses["Babylon"]) {
            solvbtcAddresses["Babylon"] = [];
        }
        solvbtcAddresses["Babylon"].push(...solvbtcBabylonData.map(item => item.btcAddress));

        // SolvBTC.BBN
        const solvbtcBBN = await btcData("SolvBTC.BBN", solvbtcAddresses["Babylon"] ?? []);
        await updateBusinessConfig("solv-btc-bbn-addresses", solvbtcBBN)

        // xSolvBTC
        const xSolvBTC = await btcData("xSolvBTC", solvbtcAddresses["Babylon"] ?? []);
        await updateBusinessConfig("x-solv-btc-addresses", xSolvBTC)

        // SolvBTC.CORE
        const solvbtcCORE = await btcData("SolvBTC.CORE", solvbtcAddresses["Core"] ?? []);
        await updateBusinessConfig("solv-btc-core-addresses", solvbtcCORE)

        // SolvBTC.ENA
        // const solvbtcENA = await btcData("SolvBTC.ENA", solvbtcAddresses["Ethena"] ?? []);
        // await updateBusinessConfig("solv-btc-ena-addresses", solvbtcENA)

        // SolvBTC.TRADING
        const solvbtcTrading = await btcData("SolvBTC.TRADING", solvbtcAddresses["Ethena"] ?? []);
        await updateBusinessConfig("solv-btc-trading-addresses", solvbtcTrading)
    } catch (error) {
        console.log("chainlinkProof error", JSON.stringify(error))
    }
}

async function btcData(accountName: string, btcAddresses: string[]): Promise<BtcData> {
    let data: BtcData = {
        accountName,
        result: [] as { id: number; address: string; symbol: string; addressType: string; walletName: string; }[],
        count: btcAddresses.length,
        EVMresult: {} as EVMResult,
        lastUpdatedAt: new Date().toISOString(),
    };

    for (let i = 0; i < btcAddresses.length; i++) {
        const btcAddress = btcAddresses[i];
        const type = checkBitcoinAddress(btcAddress);

        data.result.push({
            id: i,
            address: btcAddress,
            symbol: "BTC",
            addressType: type,
            walletName: `BTC Wallet ${i + 1}`,
        });
    }

    if (accountName === "SolvBTC") {
        for (const [key, value] of Object.entries(evmResult)) {
            if (!data.EVMresult) {
                data.EVMresult = {};
            }
            if (!data.EVMresult[key]) {
                data.EVMresult[key] = { chain_id: 0, vault: "", tokens: [] };
            }
            data.EVMresult[key].chain_id = value.chainId;
            data.EVMresult[key].vault = value.vault;

            const tokenPromises = value.tokens.map(async (token) => {
                const balance = await getBalanceWithRetry(value.chainId, token, value.vault);
                const decimal = await getDecimalsWithRetry(value.chainId, token);
                return {
                    tokenAddress: token,
                    tokenBalance: balance.toString(),
                    tokenDecimal: decimal.toString(),
                };
            });

            const tokenInfo = await Promise.all(tokenPromises);
            data.EVMresult[key].tokens.push(...tokenInfo);
        }
    } else {
        delete data.EVMresult;
    }

    return data;
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
        title: '[自动更新:ChainLinkProof]' + key,
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

function checkBitcoinAddress(address: string): string {
    const taprootbc1pPattern = /^bc1p/;
    const segwitbc1qPattern = /^bc1q/;
    const legacy1Pattern = /^1/;
    const segwit3Pattern = /^3/;

    if (taprootbc1pPattern.test(address)) {
        return 'taproot';
    } else if (segwitbc1qPattern.test(address)) {
        return 'segwit';
    } else if (legacy1Pattern.test(address)) {
        return 'legacy';
    } else if (segwit3Pattern.test(address)) {
        return 'segwit';
    } else {
        return 'unknown';
    }
}
