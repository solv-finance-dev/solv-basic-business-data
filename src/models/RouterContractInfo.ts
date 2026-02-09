import { Table, Column, Model, Sequelize, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';

@Table({
	tableName: 'router_contract_info',
	timestamps: true,
})
export default class RouterContractInfo extends Model {
	@PrimaryKey
	@AutoIncrement
	@Column({ type: DataType.BIGINT })
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
		field: 'router_type',
		allowNull: true,
		type: DataType.STRING(32),
	})
	declare routerType?: string;

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
}
