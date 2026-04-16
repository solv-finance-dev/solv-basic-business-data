import {Column, DataType, Model, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_wrapped_asset_info',
    timestamps: true,
})
export default class BasicWrappedAssetInfo extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
    })
    declare id: number;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare chainId: number;

    @Column({
        field: 'token_address',
        type: DataType.STRING(66),
        allowNull: false,
    })
    declare tokenAddress: string;

    @Column({
        type: DataType.STRING(66),
        allowNull: false,
    })
    declare holder: string;

    @Column({
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare symbol: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 18,
    })
    declare decimals: number;

    @Column({
        type: DataType.DECIMAL(78, 0),
        allowNull: false,
        defaultValue: 0,
    })
    declare balance: string;

    @Column({
        field: 'last_updated',
        type: DataType.BIGINT,
    })
    declare lastUpdated: number;

    @Column({
        field: 'created_at',
        type: DataType.DATE,
        defaultValue: Sequelize.literal('NOW()'),
    })
    declare createdAt: Date;

    @Column({
        field: 'updated_at',
        type: DataType.DATE,
        defaultValue: Sequelize.literal('NOW()'),
    })
    declare updatedAt: Date;
}
