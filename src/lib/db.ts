import { Sequelize } from 'sequelize-typescript';
import * as pg from 'pg';
import { Dialect } from 'sequelize/types/sequelize';
import 'reflect-metadata';
import { getToken } from './token';
import { getSecretValue } from './secret';
import {
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
	RouterContractInfo
} from "@solvprotocol/models";

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
			console.log('localFlag:', localFlag)

			const sequelize = new Sequelize({
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
					RouterContractInfo
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
