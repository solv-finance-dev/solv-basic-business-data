import { Sequelize } from 'sequelize-typescript';
import * as pg from 'pg';
import { Dialect } from 'sequelize/types/sequelize';
import 'reflect-metadata';
import {getRawSequelize} from "./dbClient";
import { getToken } from './token';
import { getSecretValue } from './secret';
import BusinessConfig from "../models/business/BusinessConfig";
import PorDataHistoryBusiness from '../models/business/PorDataHistory';
import BizBabylonAddresses from '../models/business/BizBabylonAddresses';
import BizCurrencyInfo from '../models/business/BizCurrencyInfo';
import BizNonEvmVaultBalance from '../models/business/BizNonEvmVaultBalance';
import BizPoolOrderSlotInfo from '../models/business/BizPoolOrderSlotInfo';
import BizSolvBtcIssuances from '../models/business/BizSolvBtcIssuances';
import BizSolvBtcReserves from '../models/business/BizSolvBtcReserves';
import BizSolvBtcYTIssuances from '../models/business/BizSolvBtcYTIssuances';
import BizSolvBtcYTReserves from '../models/business/BizSolvBtcYTReserves';
import BizSaleRedeem from '../models/business/BizSaleRedeem';
import BizTokenTransferRecords from '../models/business/BizTokenTransferRecords';
import BizSolvbtcMintBurn from '../models/business/BizSolvbtcMintBurn';
import BizWrappedAssetInfo from '../models/business/BizWrappedAssetInfo';
import {
    // ── Existing 23 models (do not remove) ──
    BondCurrencyInfo,
    BtcRedeemRecord,
    CarryCollectorHistory,
    CarryInfo,
    CurrencyInfo,
    MarketInfo,
    NavRecords,
    ProtocolFeeCollectorHistory,
    ProtocolFeeInfo,
    RawOptActivity,
    RawOptContractInfo,
    RawOptErc20AssetInfo,
    RawOptErc3525TokenInfo,
    RawOptMarketContract,
    OptRawNavHistoryPool,
    RawOptPoolOrderInfo,
    RawOptPoolSlotInfo,
    RawOptRedeemSlotInfo,
    RawOptRepayInfoOpenEnd,
    RawOptSaleInfoOpenEnd,
    SftWrappedTokenInfo,
    XSolvBTCTransactionInfo,
    RouterContractInfo,
    // ── BEGIN: 112 legacy models merged from solv-external-api (10-endpoint migration §2.1.0) ──
    AccountInfo,
    Activity,
    AirdropInfo,
    AirdropSigningInfo,
    AllEvents,
    AllocationInfo,
    ApiVerifyResult,
    AssetInfo,
    AumHistory,
    BondInfo,
    BtcDepositMintRecords,
    BtcDepositPlatform,
    BtcEvmRegistryInfo,
    BtcMainnetInfo,
    BtcMinterContract,
    BtcSignerAddress,
    BtcStakeMintRecords,
    BtcVaultAddress,
    BtcWhitelists,
    CarryCollectorInfo,
    Contract,
    ContractInfo,
    CreditInfo,
    CrossChainBridgeInfo,
    CrossChainTokenInfo,
    CustodyBalanceHistory,
    CustodyInfo,
    DexConfigInfo,
    Erc3525ContractInfo,
    Erc3525Event,
    Erc3525TokenInfo,
    FofStrategyInfo,
    FofStrategyPrincipleHistory,
    FundsVaultBalance,
    InquireInfo,
    Issuance,
    IssuerInfo,
    KVConfig,
    LiquidityConfigInfo,
    LoginHistory,
    LstInfo,
    MailErrorMessage,
    ManualCurrencyInfo,
    ManualFunds,
    ManualNavHistory,
    MarketContractInfo,
    MarketCoreHistory,
    MarketPrice,
    MarketPriceHistory,
    MintBurnPermission,
    NavAdapterInfo,
    NavHistoryPool,
    NavOriginalHistory,
    NavYieldHistory,
    Phase2BaseUserDailyTvl,
    Phase2DefiUserDailyTvl,
    Phase2LiquidityConfigInfo,
    Phase2PointSysAccountInfo,
    Phase2PointSysAccountInfoSnapshot,
    Phase2PointSysActivityCard,
    Phase2PointSysPointDetail,
    Phase2PointSysRanking,
    PointSysAccountInfo,
    PointSysActivityCard,
    PointSysPointDetail,
    PointSysRanking,
    PointSysSeedUser,
    PoolOrderInfo,
    PoolSlotInfo,
    PoolStrategy,
    PorDataHistory,
    ProductInfo,
    RawBondSlotEvent,
    RawBondSlotInfo,
    RawMarketContract,
    RawMarketEvent,
    RawMarketIssuance,
    RawPoolOrderInfo,
    RawPoolSlotEvent,
    RawPoolSlotInfo,
    RawRedeemNav,
    RawRedeemSlotEvent,
    RawRedeemSlotInfo,
    RawRouterEvent,
    RawSftWrappedTokenInfo,
    RawSubscribeNav,
    RawWrappedAssetInfo,
    RawWrappedEvent,
    RedeemInfo,
    RedeemableConfigInfo,
    ReferralCodes,
    ReferralInfo,
    RepayInfo,
    RepayInfoOpenEnd,
    RoadshowInfo,
    SaleInfo,
    SaleInfoOpenEnd,
    SolvBtcAssets,
    SolvBtcAutoData,
    SolvBtcIssuances,
    SolvBtcLiabilities,
    SolvBtcReserves,
    SolvBtcYTIssuances,
    SolvBtcYTReserves,
    Strategies,
    SupervisorInfo,
    TagInfo,
    TagMap,
    UserSharesSnapshot,
    UserWalletInfo,
    WrappedAssetInfo,
    YieldPoolConfig,
    // ── END: 112 legacy models ──
} from "@solvprotocol/models";

export async function initRawSequelize(): Promise<Sequelize> {
    try {
        if (!process.env.DB_PROXY_HOSTNAME) {
            throw new Error('BUSINESS_DB_PROXY_HOSTNAME is not set.');
        }
        const token = await getToken(process.env.DB_PROXY_HOSTNAME, process.env.DB_USER_NAME, process.env.CDK_DEPLOY_REGION);
        return new Sequelize({
            host: process.env.DB_PROXY_HOSTNAME,
            dialectModule: pg,
            dialect: 'postgres',
            database: process.env.DATABASE_NAME,
            username: process.env.DB_USER_NAME,
            password: token,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            },
            models: [
                BondCurrencyInfo,
                BtcRedeemRecord,
                CarryCollectorHistory,
                CarryInfo,
                CurrencyInfo,
                MarketInfo,
                NavRecords,
                ProtocolFeeCollectorHistory,
                ProtocolFeeInfo,
                RawOptActivity,
                RawOptContractInfo,
                RawOptErc20AssetInfo,
                RawOptErc3525TokenInfo,
                RawOptMarketContract,
                OptRawNavHistoryPool,
                RawOptPoolOrderInfo,
                RawOptPoolSlotInfo,
                RawOptRedeemSlotInfo,
                RawOptRepayInfoOpenEnd,
                RawOptSaleInfoOpenEnd,
                SftWrappedTokenInfo,
                XSolvBTCTransactionInfo,
                RouterContractInfo,
                // ── BEGIN: 112 legacy models (10-endpoint migration §2.1.0) ──
                AccountInfo,
                Activity,
                AirdropInfo,
                AirdropSigningInfo,
                AllEvents,
                AllocationInfo,
                ApiVerifyResult,
                AssetInfo,
                AumHistory,
                BondInfo,
                BtcDepositMintRecords,
                BtcDepositPlatform,
                BtcEvmRegistryInfo,
                BtcMainnetInfo,
                BtcMinterContract,
                BtcSignerAddress,
                BtcStakeMintRecords,
                BtcVaultAddress,
                BtcWhitelists,
                CarryCollectorInfo,
                Contract,
                ContractInfo,
                CreditInfo,
                CrossChainBridgeInfo,
                CrossChainTokenInfo,
                CustodyBalanceHistory,
                CustodyInfo,
                DexConfigInfo,
                Erc3525ContractInfo,
                Erc3525Event,
                Erc3525TokenInfo,
                FofStrategyInfo,
                FofStrategyPrincipleHistory,
                FundsVaultBalance,
                InquireInfo,
                Issuance,
                IssuerInfo,
                KVConfig,
                LiquidityConfigInfo,
                LoginHistory,
                LstInfo,
                MailErrorMessage,
                ManualCurrencyInfo,
                ManualFunds,
                ManualNavHistory,
                MarketContractInfo,
                MarketCoreHistory,
                MarketPrice,
                MarketPriceHistory,
                MintBurnPermission,
                NavAdapterInfo,
                NavHistoryPool,
                NavOriginalHistory,
                NavYieldHistory,
                Phase2BaseUserDailyTvl,
                Phase2DefiUserDailyTvl,
                Phase2LiquidityConfigInfo,
                Phase2PointSysAccountInfo,
                Phase2PointSysAccountInfoSnapshot,
                Phase2PointSysActivityCard,
                Phase2PointSysPointDetail,
                Phase2PointSysRanking,
                PointSysAccountInfo,
                PointSysActivityCard,
                PointSysPointDetail,
                PointSysRanking,
                PointSysSeedUser,
                PoolOrderInfo,
                PoolSlotInfo,
                PoolStrategy,
                PorDataHistory,
                ProductInfo,
                RawBondSlotEvent,
                RawBondSlotInfo,
                RawMarketContract,
                RawMarketEvent,
                RawMarketIssuance,
                RawPoolOrderInfo,
                RawPoolSlotEvent,
                RawPoolSlotInfo,
                RawRedeemNav,
                RawRedeemSlotEvent,
                RawRedeemSlotInfo,
                RawRouterEvent,
                RawSftWrappedTokenInfo,
                RawSubscribeNav,
                RawWrappedAssetInfo,
                RawWrappedEvent,
                RedeemInfo,
                RedeemableConfigInfo,
                ReferralCodes,
                ReferralInfo,
                RepayInfo,
                RepayInfoOpenEnd,
                RoadshowInfo,
                SaleInfo,
                SaleInfoOpenEnd,
                SolvBtcAssets,
                SolvBtcAutoData,
                SolvBtcIssuances,
                SolvBtcLiabilities,
                SolvBtcReserves,
                SolvBtcYTIssuances,
                SolvBtcYTReserves,
                Strategies,
                SupervisorInfo,
                TagInfo,
                TagMap,
                UserSharesSnapshot,
                UserWalletInfo,
                WrappedAssetInfo,
                YieldPoolConfig,
                // ── END: 112 legacy models ──
            ],
            define: {
                timestamps: false,
                freezeTableName: true,
            },
            pool: {
                max: 10,
                min: 1,
                idle: 0,
                acquire: 60000,
            },
            // 生产环境不打印SQL日志
            logging: process.env.NODE_ENV !== 'prod' ? console.log : false,
        });

    } catch (err: any) {
        console.error('Init Basic Sequelize Error:', err);
        throw new Error('Set Up Basic DB Connection Failed.');
    }
}

export async function initBusinessSequelize() {
    try {
        const username = process.env.BUSINESS_DB_USER_NAME;
        const hostUrl = process.env.BUSINESS_DB_PROXY_HOSTNAME;
        const database = process.env.BUSINESS_DATABASE_NAME;
        if (!hostUrl) {
            throw new Error('BUSINESS_DB_PROXY_HOSTNAME is not set.');
        }

        const token = await getToken(hostUrl, username, process.env.CDK_DEPLOY_REGION);
        return new Sequelize({
            host: hostUrl,
            dialectModule: pg,
            dialect: 'postgres',
            database: database,
            username: username,
            password: token,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            },
            models: [
                BusinessConfig,
                PorDataHistoryBusiness,
                BizBabylonAddresses,
                BizCurrencyInfo,
                BizNonEvmVaultBalance,
                BizPoolOrderSlotInfo,
                BizSolvBtcIssuances,
                BizSolvBtcReserves,
                BizSolvBtcYTIssuances,
                BizSolvBtcYTReserves,
                BizSaleRedeem,
                BizTokenTransferRecords,
                BizSolvbtcMintBurn,
                BizWrappedAssetInfo,
            ],
            define: {
                timestamps: false,
                freezeTableName: true,
            },
            pool: {
                max: 10,
                min: 1,
                idle: 0,
                acquire: 60000,
            },
            // 生产环境不打印SQL日志
            logging: process.env.NODE_ENV !== 'prod' ? console.log : false,
        });

    } catch (err: any) {
        console.error('Init Business Sequelize Error:', err);
        throw new Error('Set Up Business DB Connection Failed.');
    }
}

export async function closeSequelize(): Promise<void> {
    const sequelize = await getRawSequelize();
    await sequelize.close();
    const businessSequelize = await initBusinessSequelize();
    await businessSequelize.close();
}
