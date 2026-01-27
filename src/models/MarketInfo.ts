import {Table, Column, Model, Sequelize, PrimaryKey, AutoIncrement, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_market_info',
    timestamps: true,
})
export default class MarketInfo extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({type: DataType.BIGINT})
    declare id: number;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
    })
    declare chainId: number;

    @Column({
        field: 'contract_address',
        type: DataType.STRING(64),
    })
    declare contractAddress: string;

    @Column({
        field: 'name',
        allowNull: true,
        type: DataType.STRING(255),
    })
    declare name: string;

    @Column({
        field: 'extra_info',
        allowNull: true,
        type: DataType.JSONB,
    })
    declare extraInfo: object;

    @Column({
        field: 'created_at',
        type: DataType.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    })
    declare createdAt?: Date;

    @Column({
        field: 'updated_at',
        type: DataType.DATE,
    })
    declare updatedAt?: Date;

    @Column({
        field: 'market_type',
        allowNull: true,
        type: DataType.STRING(32),
        comment: 'Close-end, Open-end',
    })
    declare marketType?: string;

    @Column({
        field: 'protocol_fee_rate',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare protocolFeeRate?: string;

    @Column({
        field: 'protocol_fee_collector',
        allowNull: true,
        type: DataType.STRING,
    })
    declare protocolFeeCollector?: string;
}