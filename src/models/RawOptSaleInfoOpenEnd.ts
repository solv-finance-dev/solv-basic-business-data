import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_sale_info_open_end',
    timestamps: true,
})
export default class RawOptSaleInfoOpenEnd extends Model {
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
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare buyer?: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare amount?: string;

    @Column({
        field: 'currency_symbol',
        allowNull: true,
        type: DataType.STRING(16),
    })
    declare currencySymbol?: string;

    @Column({
        field: 'currency_price',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare currencyPrice?: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare nav?: string;

    @Column({
        field: 'block_timestamp',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare blockTimestamp?: number;

    @Column({
        field: 'created_at',
        allowNull: true,
        type: DataType.DATE(6),
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