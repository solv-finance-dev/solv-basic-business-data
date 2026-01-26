import { Sequelize } from 'sequelize-typescript';
import * as pg from 'pg';
import { Dialect } from 'sequelize/types/sequelize';
import 'reflect-metadata';
import { getToken } from './token';
import { getSecretValue } from './secret';
import BondCurrencyInfo from '../models/BondCurrencyInfo';
import BtcRedeemRecord from '../models/BtcRedeemRecord';
import CarryCollectorHistory from '../models/CarryCollectorHistory';
import CarryInfo from '../models/CarryInfo';
import CurrencyInfo from '../models/CurrencyInfo';
import MarketInfo from '../models/MarketInfo';
import NavRecords from '../models/NavRecords';
import ProtocolFeeCollectorHistory from '../models/ProtocolFeeCollectorHistory';
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

let sequelizeInstance: Sequelize | null = null;
let sequelizeInitPromise: Promise<Sequelize> | null = null;

export async function initSequelize(): Promise<Sequelize> {
	if (sequelizeInstance) {
		return sequelizeInstance;
	}
	if (sequelizeInitPromise) {
		return sequelizeInitPromise;
	}

	sequelizeInitPromise = (async () => {
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

			const sequelize = new Sequelize({
				host: localFlag ? host : process.env.DB_PROXY_HOSTNAME,
				dialectModule: pg,
				dialect: engine,
				database: process.env.DATABASE_NAME,
				username,
				password: localFlag ? password : token,
				dialectOptions: {
                    ssl: true,
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
					RawOptNavHistoryPool,
					RawOptPoolOrderInfo,
					RawOptPoolSlotInfo,
					RawOptRedeemSlotInfo,
					RawOptRepayInfoOpenEnd,
					RawOptSaleInfoOpenEnd,
					SftWrappedTokenInfo,
					XsolvbtcTransactionInfo,
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
				logging: false,
			});

			sequelizeInstance = sequelize;
			return sequelize;
		} catch (err: any) {
			sequelizeInitPromise = null;
            console.error('Init Sequelize Error:', err);
			throw new Error('Set Up DB Connection Failed.');
		}
	})();

	return sequelizeInitPromise;
}

export async function closeSequelize(): Promise<void> {
	if (sequelizeInstance) {
		await sequelizeInstance.close();
	}

	sequelizeInstance = null;
	sequelizeInitPromise = null;
}
