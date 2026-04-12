import {Sequelize} from 'sequelize-typescript';
import * as pg from 'pg';
import {Dialect} from 'sequelize/types/sequelize';
import 'reflect-metadata';
import {getToken} from './token';
import {getSecretValue} from './secret';
import PorDataHistory from '../models/business/PorDataHistory';
// Add more models as interfaces are implemented: #2, #3, #7, #9

export async function initBusinessSequelize(): Promise<Sequelize> {
    try {
        const token = await getToken();
        const secretString = (await getSecretValue(
            process.env.BUSINESS_SECRET_ID!,
            process.env.CDK_DEPLOY_REGION!
        )) ?? '';
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
                PorDataHistory,
                // Interface #3: add YieldPoolSnapshot, CrossChainTokenInfo
                // Interface #7: add LstInfo
                // Interface #9: add BtcPlusApyHistory, KvConfig
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
            logging: process.env.NODE_ENV !== 'prod' ? console.log : false,
        });
    } catch (err: any) {
        console.error('Init Business Sequelize Error:', err);
        throw new Error('Set Up Business DB Connection Failed.');
    }
}
