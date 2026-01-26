import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_btc_redeem_record',
    timestamps: true,
})
export default class BtcRedeemRecord extends Model {
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
        type: DataType.STRING(128),
    })
    declare tokenAddress?: string;

    @Column({
        field: 'burn_amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare burnAmount?: string;

    @Column({
        field: 'burn_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare burnHash?: string;

    @Column({
        field: 'from_address',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare fromAddress?: string;

    @Column({
        field: 'receiver',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare receiver?: string;

    @Column({
        field: 'withdraw_amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare withdrawAmount?: string;

    @Column({
        field: 'state',
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare state?: string;

    @Column({
        field: 'btc_transfer_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare btcTransferHash?: string;

    @Column({
        field: 'withdraw_time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare withdrawTime?: number;

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
        field: 'completion_time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare completionTime?: number;
}
