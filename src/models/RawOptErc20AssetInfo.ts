import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_erc20_asset_info',
    timestamps: true,
})
export default class RawOptErc20AssetInfo extends Model {
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
        field: 'token_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare tokenAddress?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare holder?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare name?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare symbol?: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare balance?: string;

    @Column({
        field: 'mint_time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare mintTime?: number;

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

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

    @Column({
        field: 'sft_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare sftAddress?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare slot?: string;
}
