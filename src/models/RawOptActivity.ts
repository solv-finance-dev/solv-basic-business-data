import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
	tableName: 'test_raw_opt_activity',
	timestamps: true,
})
export default class OptRawActivity extends Model {
	@Column({
		primaryKey: true,
		autoIncrement: true,
		type: DataType.BIGINT,
	})
	declare id: number;

	@Column({
		field: 'chain_id',
		allowNull: true,
		type: DataType.INTEGER,
	})
	declare chainId?: number;

	@Column({
		field: 'contract_address',
		allowNull: true,
		type: DataType.STRING(64),
	})
	declare contractAddress?: string;

	@Column({
		field: 'token_id',
		type: DataType.STRING(64),
	})
	declare tokenId: string;

	@Column({
		field: 'block_number',
		allowNull: true,
		type: DataType.BIGINT,
	})
	declare blockNumber?: number;

	@Column({
		field: 'tx_hash',
		allowNull: true,
		type: DataType.STRING(128),
	})
	declare txHash?: string;

	@Column({
		field: 'transaction_index',
		allowNull: true,
		type: DataType.INTEGER,
	})
	declare transactionIndex?: number;

	@Column({
		field: 'event_index',
		allowNull: true,
		type: DataType.INTEGER,
	})
	declare eventIndex?: number;

	@Column({
		field: 'block_timestamp',
		allowNull: true,
		type: DataType.INTEGER,
	})
	declare blockTimestamp?: number;

	@Column({
		field: 'from_address',
		allowNull: true,
		type: DataType.STRING,
	})
	declare fromAddress?: string;

	@Column({
		field: 'to_address',
		allowNull: true,
		type: DataType.STRING,
	})
	declare toAddress?: string;

	@Column({
		field: 'amount',
		allowNull: true,
		type: DataType.DECIMAL,
	})
	declare amount?: string;

	@Column({
		field: 'decimals',
		allowNull: true,
		type: DataType.INTEGER,
	})
	declare decimals?: number;

	@Column({
		field: 'currency_address',
		allowNull: true,
		type: DataType.STRING(64),
	})
	declare currencyAddress?: string;

	@Column({
		field: 'currency_symbol',
		allowNull: true,
		type: DataType.STRING,
	})
	declare currencySymbol: string;

	@Column({
		field: 'currency_decimals',
		allowNull: true,
		type: DataType.INTEGER,
	})
	declare currencyDecimals?: number;

	@Column({
		field: 'slot',
		allowNull: true,
		type: DataType.STRING,
	})
	declare slot?: string;

	@Column({
		field: 'transaction_type',
		allowNull: true,
		type: DataType.STRING,
	})
	declare transactionType?: string;

	@Column({
		allowNull: true,
		type: DataType.DECIMAL,
		comment: '当时的净值，而不是最新净值',
	})
	declare nav?: string;

	@Column({
		field: 'pool_id',
		allowNull: true,
		type: DataType.STRING(128),
	})
	declare poolId?: string;

	@Column({
		field: 'created_at',
		allowNull: true,
		type: DataType.DATE,
		defaultValue: Sequelize.literal('now()'),
	})
	declare createdAt?: Date;

	@Column({
		field: 'updated_at',
		allowNull: true,
		type: DataType.DATE,
	})
	declare updatedAt?: Date;

	@Column({
		field: 'product_type',
		type: DataType.STRING(32),
	})
	declare productType: string;

	@Column({
		field: 'last_updated',
		allowNull: true,
		type: DataType.INTEGER,
	})
	declare lastUpdated?: number;
}