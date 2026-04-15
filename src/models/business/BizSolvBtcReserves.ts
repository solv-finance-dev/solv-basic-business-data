import {Column, DataType, Model, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_solvbtc_reserves',
    timestamps: true,
})
export default class BizSolvBtcReserves extends Model {
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
        field: 'asset_name',
        allowNull: true,
        type: DataType.STRING,
    })
    declare assetName?: string;

    @Column({
        field: 'token_address',
        type: DataType.STRING(64),
    })
    declare tokenAddress: string;

    @Column({
        field: 'vault',
        type: DataType.STRING(64),
    })
    declare vault: string;

    @Column({
        field: 'vault_address',
        type: DataType.STRING(64),
    })
    declare vaultAddress: string;

    @Column({
        field: 'url',
        allowNull: true,
        type: DataType.STRING,
    })
    declare url?: string;

    @Column({
        field: 'amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare amount?: string;

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
        field: 'decimals',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

    @Column({
        field: 'snapshot_time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare snapshotTime?: number;

    @Column({
        field: 'order_no',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare orderNo?: number;
}
