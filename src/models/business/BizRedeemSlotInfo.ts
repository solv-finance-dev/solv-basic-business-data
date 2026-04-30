import {Column, DataType, Model, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_redeem_slot_info',
    timestamps: true,
})
export default class BizRedeemSlotInfo extends Model {
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
        comment: 'Stored in lowercase',
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
        field: 'handle_status',
        allowNull: true,
        type: DataType.STRING(128),
        comment: 'Settlement status',
    })
    declare handleStatus?: string;

    @Column({
        field: 'redeem_amount',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: 'Redeem share amount',
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
        field: 'block_timestamp',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare blockTimestamp?: number;

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
        field: 'nav_set_time',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare navSetTime?: number;

    @Column({
        field: 'currency_symbol',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare currencySymbol?: string;

    @Column({
        field: 'currency_address',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare currencyAddress?: string;

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
        type: DataType.BIGINT,
    })
    declare startTime?: number;

    @Column({
        field: 'state',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare state?: string;
}
