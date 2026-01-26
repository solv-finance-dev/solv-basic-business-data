import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_market_contract',
    timestamps: true,
})
export default class RawOptMarketContract extends Model {
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
        field: 'market_contract_address',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare marketContractAddress?: string;

    @Column({
        field: 'contract_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare contractAddress?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare issuer?: string;

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

    @Column({
        field: 'default_fee_rate',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare defaultFeeRate?: number;

    @Column({
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare state?: string;

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
    })
    declare createdAt?: Date;

    @Column({
        field: 'updated_at',
        allowNull: true,
        type: DataType.DATE,
    })
    declare updatedAt?: Date;
}
