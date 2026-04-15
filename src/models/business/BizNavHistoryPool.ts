import { Model, Table, Column, DataType, Sequelize } from 'sequelize-typescript';

@Table({
	tableName: 'biz_nav_history_pool',
	timestamps: true,
})
export default class BizNavHistoryPool extends Model {
	@Column({
		primaryKey: true,
		autoIncrement: true,
		type: DataType.BIGINT,
	})
	declare id: number;

	@Column({
		field: 'pool_id',
		allowNull: true,
		type: DataType.STRING(128),
	})
	declare poolId?: string;

	@Column({
		allowNull: true,
		type: DataType.DECIMAL,
	})
	declare nav?: string;

	@Column({
		field: 'nav_type',
		allowNull: true,
		type: DataType.STRING(16),
	})
	declare navType?: string;

	@Column({
		field: 'nav_date',
		allowNull: true,
		type: DataType.DATE,
	})
	declare navDate?: Date;

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
