import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_btc_redeem_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
})
export default class BtcRedeemRecord extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
    })
    declare id: string;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare chainId?: number;

    @Column({
        field: 'token_address',
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare tokenAddress?: string;

    @Column({
        field: 'burn_amount',
        type: DataType.DECIMAL,
        allowNull: true,
    })
    declare burnAmount?: string;

    @Column({
        field: 'burn_hash',
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare burnHash?: string;

    @Column({
        field: 'from_address',
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare fromAddress?: string;

    @Column({
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare receiver?: string;

    @Column({
        field: 'withdraw_amount',
        type: DataType.DECIMAL,
        allowNull: true,
    })
    declare withdrawAmount?: string;

    @Column({
        type: DataType.STRING(32),
        allowNull: true,
    })
    declare state?: string;

    @Column({
        field: 'btc_transfer_hash',
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare btcTransferHash?: string;

    @Column({
        field: 'withdraw_time',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare withdrawTime?: number;

    @Column({
        field: 'completion_time',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare completionTime?: number;

    @Column({
        field: 'last_updated',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare lastUpdated?: number;
}