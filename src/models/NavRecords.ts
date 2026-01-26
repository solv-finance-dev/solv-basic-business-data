import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_nav_records',
    timestamps: true,
})
export default class NavRecords extends Model {
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
        field: 'pool_id',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare poolId?: string;

    @Column({
        field: 'nav_type',
        allowNull: true,
        type: DataType.STRING(16),
    })
    declare navType?: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare nav?: string;

    @Column({
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare time?: number;

    @Column({
        field: 'tx_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare txHash?: string;

    @Column({
        field: 'transaction_index',
        type: DataType.INTEGER,
    })
    declare transactionIndex: number;

    @Column({
        field: 'event_index',
        type: DataType.INTEGER,
    })
    declare eventIndex: number;

    @Column({
        field: 'last_updated',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare lastUpdated?: number;

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
