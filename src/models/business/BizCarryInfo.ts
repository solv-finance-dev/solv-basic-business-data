import {Column, DataType, Model, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_carry_info',
    timestamps: true,
})
export default class BizCarryInfo extends Model {
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
        field: 'currency_balance',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare currencyBalance?: string;

    @Column({
        field: 'carry_amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare carryAmount?: string;

    @Column({
        field: 'redeem_slot',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare redeemSlot?: string;

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

    @Column({
        field: 'currency_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare currencyAddress?: string;
}
