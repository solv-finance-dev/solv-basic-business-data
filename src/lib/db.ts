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
import BizPoolOrderInfo from '../models/business/BizPoolOrderInfo';
import BizPoolOrderSlotInfo from '../models/business/BizPoolOrderSlotInfo';
import BizPoolSlotInfo from '../models/business/BizPoolSlotInfo';
import BizSolvBtcIssuances from '../models/business/BizSolvBtcIssuances';
import BizSolvBtcReserves from '../models/business/BizSolvBtcReserves';
import BizSolvBtcYTIssuances from '../models/business/BizSolvBtcYTIssuances';
import BizSolvBtcYTReserves from '../models/business/BizSolvBtcYTReserves';
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
        const token = await getToken();
        const secretString = (await getSecretValue(process.env.SECRET_ID!, process.env.CDK_DEPLOY_REGION!)) ?? '';
        const {
            username,
            password,
            engine,
            host,
        }: {
            username: string;
            password: string;
            engine: Dialect | undefined;
            host: string;
        } = JSON.parse(secretString!);
        const localFlag = process.env.CONFIG_ENV === 'local';

        return new Sequelize({
            host: localFlag ? host : process.env.DB_PROXY_HOSTNAME,
            dialectModule: pg,
            dialect: engine,
            database: process.env.DATABASE_NAME,
            username,
            password: localFlag ? password : token,
            dialectOptions: {
                ssl: !localFlag,
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
        throw new Error('Set Up DB Connection Failed.');
    }
}

export async function initBusinessSequelize() {
    try {
        const token = await getToken();
        const secretString = (await getSecretValue(process.env.BUSINESS_SECRET_ID!, process.env.CDK_DEPLOY_REGION!)) ?? '';
        const {
            username,
            password,
            engine,
            host,
        }: {
            username: string;
            password: string;
            engine: Dialect | undefined;
            host: string;
        } = JSON.parse(secretString!);
        const localFlag = process.env.CONFIG_ENV === 'local';

        return new Sequelize({
            host: localFlag ? host : process.env.BUSINESS_DB_PROXY_HOSTNAME,
            dialectModule: pg,
            dialect: engine,
            database: process.env.BUSINESS_DATABASE_NAME,
            username,
            password: localFlag ? password : token,
            dialectOptions: {
                ssl: !localFlag,
            },
            models: [
                BusinessConfig,
                PorDataHistoryBusiness,
                BizBabylonAddresses,
                BizCurrencyInfo,
                BizNonEvmVaultBalance,
                BizPoolOrderInfo,
                BizPoolOrderSlotInfo,
                BizPoolSlotInfo,
                BizSolvBtcIssuances,
                BizSolvBtcReserves,
                BizSolvBtcYTIssuances,
                BizSolvBtcYTReserves,
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
        throw new Error('Set Up DB Connection Failed.');
    }
}

export async function closeSequelize(): Promise<void> {
    const sequelize = await getRawSequelize();
    await sequelize.close();
    const businessSequelize = await initBusinessSequelize();
    await businessSequelize.close();
}
