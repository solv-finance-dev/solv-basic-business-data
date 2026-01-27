import {Table, Column, Model, Sequelize, PrimaryKey, AutoIncrement, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_sft_wrapped_token_info',
    timestamps: true,
})
export default class SftWrappedTokenInfo extends Model {
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
        field: 'sft_address',
        type: DataType.STRING(64),
    })
    declare sftAddress: string;

    @Column({
        field: 'slot',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare slot?: string;

    @Column({
        field: 'token_address',
        type: DataType.STRING(64),
    })
    declare tokenAddress: string;

    @Column({
        field: 'name',
        type: DataType.STRING,
    })
    declare name: string;

    @Column({
        field: 'symbol',
        type: DataType.STRING,
    })
    declare symbol: string;

    @Column({
        field: 'decimals',
        type: DataType.INTEGER,
    })
    declare decimals: number;

    @Column({
        field: 'nav_oracle',
        type: DataType.STRING(64),
    })
    declare navOracle: string;

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
        field: 'multi_asset_pool',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare multiAssetPool?: string;

    @Column({
        field: 'is_default_slot',
        allowNull: true,
        type: DataType.BOOLEAN,
    })
    declare isDefaultSlot: boolean;
}