import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_market_info',
    timestamps: true,
})
export default class MarketInfo extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
    })
    declare id: number;

    @Column({
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare name?: string;

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
        field: 'extra_info',
        allowNull: true,
        type: DataType.JSONB,
    })
    declare extraInfo?: object;

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
        field: 'market_type',
        allowNull: true,
        type: DataType.STRING(32),
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
        type: DataType.STRING(64),
    })
    declare protocolFeeCollector?: string;
}
