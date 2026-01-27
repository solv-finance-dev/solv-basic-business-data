import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_nav_history_pool',
    timestamps: true,
})
export default class OptRawNavHistoryPool extends Model {
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
        comment: '申购, 赎回',
    })
    declare navType?: string;

    @Column({
        field: 'time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare time?: number;

    @Column({
        field: 'original_nav',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare originalNav?: string;

    @Column({
        field: 'adjust_coefficient',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare adjustCoefficient?: string;

    @Column({
        field: 'adjusted_nav',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare adjustedNav?: string;

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
        field: 'last_updated',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare lastUpdated?: number;
}