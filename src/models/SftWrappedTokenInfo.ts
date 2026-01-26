import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_sft_wrapped_token_info',
    timestamps: true,
})
export default class SftWrappedTokenInfo extends Model {
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
    declare name?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare symbol?: string;

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

    @Column({
        field: 'nav_oracle',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare navOracle?: string;

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
    declare isDefaultSlot?: boolean;
}
