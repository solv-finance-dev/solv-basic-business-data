import {Table, Column, Model, Sequelize, PrimaryKey, AutoIncrement, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_market_contract',
    timestamps: true,
})
export default class RawOptMarketContract extends Model {
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
        field: 'market_contract_address',
        type: DataType.STRING(64),
    })
    declare marketContractAddress: string;

    @Column({
        field: 'contract_address',
        type: DataType.STRING(64),
    })
    declare contractAddress: string;

    @Column({
        field: 'issuer',
        type: DataType.STRING(64),
    })
    declare issuer: string;

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

    @Column({
        field: 'default_fee_rate',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare defaultFeeRate: string;

    @Column({
        field: 'last_updated',
        type: DataType.INTEGER,
    })
    declare lastUpdated: number;

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
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare state?: string;
}