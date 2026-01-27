import {Table, Column, Model, Sequelize, PrimaryKey, AutoIncrement, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_erc20_asset_info',
    timestamps: true,
})
export default class RawOptErc20AssetInfo extends Model {
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
        field: 'holder',
        type: DataType.STRING(64),
    })
    declare holder: string;

    @Column({
        field: 'token_address',
        type: DataType.STRING(64),
    })
    declare tokenAddress: string;

    @Column({
        field: 'symbol',
        type: DataType.STRING,
    })
    declare symbol: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare balance?: string;

    @Column({
        field: 'mint_time',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare mintTime?: number;

    @Column({
        field: 'last_updated',
        type: DataType.INTEGER,
    })
    declare lastUpdated: number;

    @Column({
        field: 'name',
        type: DataType.STRING,
    })
    declare name: string;

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
        field: 'decimals',
        type: DataType.INTEGER,
    })
    declare decimals: number;

    @Column({
        field: 'sft_address',
        type: DataType.STRING,
    })
    declare sftAddress: string;

    @Column({
        field: 'slot',
        type: DataType.STRING,
    })
    declare slot: string;
}