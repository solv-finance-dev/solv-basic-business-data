import { Sequelize } from 'sequelize-typescript';
import * as pg from 'pg';
import { Dialect } from 'sequelize/types/sequelize';
import 'reflect-metadata';
import {getOrCreateSequelize} from "./dbClient";
import { getToken } from './token';
import { getSecretValue } from './secret';
import BondCurrencyInfo from '../models/BondCurrencyInfo';
import BtcRedeemRecord from '../models/BtcRedeemRecord';
import CarryCollectoHistory from '../models/CarryCollectoHistory';
import CarryInfo from '../models/CarryInfo';
import CurrencyInfo from '../models/CurrencyInfo';
import MarketInfo from '../models/MarketInfo';
import NavRecords from '../models/NavRecords';
import ProtocolFeeCollectoHistory from '../models/ProtocolFeeCollectoHistory';
import ProtocolFeeInfo from '../models/ProtocolFeeInfo';
import RawOptActivity from '../models/RawOptActivity';
import RawOptContractInfo from '../models/RawOptContractInfo';
import RawOptErc20AssetInfo from '../models/RawOptErc20AssetInfo';
import RawOptErc3525TokenInfo from '../models/RawOptErc3525TokenInfo';
import RawOptMarketContract from '../models/RawOptMarketContract';
import RawOptNavHistoryPool from '../models/RawOptNavHistoryPool';
import RawOptPoolOrderInfo from '../models/RawOptPoolOrderInfo';
import RawOptPoolSlotInfo from '../models/RawOptPoolSlotInfo';
import RawOptRedeemSlotInfo from '../models/RawOptRedeemSlotInfo';
import RawOptRepayInfoOpenEnd from '../models/RawOptRepayInfoOpenEnd';
import RawOptSaleInfoOpenEnd from '../models/RawOptSaleInfoOpenEnd';
import SftWrappedTokenInfo from '../models/SftWrappedTokenInfo';
import XsolvbtcTransactionInfo from '../models/XsolvbtcTransactionInfo';
import {RouterContractInfo, OptRawNavHistoryPool} from "@solvprotocol/models";

export async function initSequelize(): Promise<Sequelize> {
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
                CarryCollectoHistory,
                CarryInfo,
                CurrencyInfo,
                MarketInfo,
                NavRecords,
                ProtocolFeeCollectoHistory,
                ProtocolFeeInfo,
                RawOptActivity,
                RawOptContractInfo,
                RawOptErc20AssetInfo,
                RawOptErc3525TokenInfo,
                RawOptMarketContract,
                RawOptNavHistoryPool,
                RawOptPoolOrderInfo,
                RawOptPoolSlotInfo,
                RawOptRedeemSlotInfo,
                RawOptRepayInfoOpenEnd,
                RawOptSaleInfoOpenEnd,
                SftWrappedTokenInfo,
                XsolvbtcTransactionInfo,

                RouterContractInfo,
                OptRawNavHistoryPool
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
        console.error('Init Sequelize Error:', err);
        throw new Error('Set Up DB Connection Failed.');
    }
}

export async function closeSequelize(): Promise<void> {
    const sequelize = await getOrCreateSequelize();
    await sequelize.close();
}
