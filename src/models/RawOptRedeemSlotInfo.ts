import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_redeem_slot_info',
    timestamps: true,
})
export default class RawOptRedeemSlotInfo extends Model {
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
        field: 'msg_sender',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare msgSender?: string;

    @Column({
        field: 'contract_address',
        allowNull: true,
        type: DataType.STRING(64),
        comment: '转成小写写入',
    })
    declare contractAddress?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare slot?: string;

    @Column({
        field: 'slot_info',
        allowNull: true,
        type: DataType.JSONB,
    })
    declare slotInfo?: object;

    @Column({
        field: 'tx_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare txHash?: string;

    @Column({
        field: 'redeem_amount',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '赎回份数',
    })
    declare redeemAmount?: string;

    @Column({
        field: 'repaid_value',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare repaidValue?: string;

    @Column({
        field: 'claimed_amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare claimedAmount?: string;

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
        field: 'nav_set_time',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare navSetTime?: string;

    @Column({
        field: 'currency_address',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare currencyAddress?: string;

    @Column({
        field: 'currency_symbol',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare currencySymbol?: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare nav?: string;

    @Column({
        field: 'pool_id',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare poolId?: string;

    @Column({
        field: 'start_time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare startTime?: number;

    @Column({
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare state?: string;

    @Column({
        field: 'handle_status',
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare handleStatus?: string;

    @Column({
        field: 'block_timestamp',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare blockTimestamp?: number;
}
