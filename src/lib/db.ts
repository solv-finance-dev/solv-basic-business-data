import { Sequelize } from 'sequelize-typescript';
import * as pg from 'pg';
import { Dialect } from 'sequelize/types/sequelize';
import 'reflect-metadata';
import { getToken } from './token';
import { getSecretValue } from './secret';
import Activity from '../models/Activity';

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
				models: [Activity],
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
