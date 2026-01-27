import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_pool_slot_info',
    timestamps: true,
})
export default class RawOptPoolSlotInfo extends Model {
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
        field: 'tx_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare txHash?: string;

    @Column({
        field: 'handle_status',
        allowNull: true,
        type: DataType.STRING(128),
        comment: '勾兑状态',
    })
    declare handleStatus?: string;

    @Column({
        field: 'total_amount',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '当前总份数',
    })
    declare totalAmount?: string;

    @Column({
        field: 'total_repaid_value',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '总还款金额',
    })
    declare totalRepaidValue?: string;

    @Column({
        field: 'total_claimed_value',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '总claim金额',
    })
    declare totalClaimedValue?: string;

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
    declare currencyAddress: string;

    @Column({
        field: 'maturity',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare maturity: number;

    @Column({
        field: 'value_date',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare valueDate: number;

    @Column({
        field: 'issue_quota',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare issueQuota: string;

    @Column({
        field: 'supervisor',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare supervisor: string;

    @Column({
        field: 'interest_rate',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare interestRate: number;

    @Column({
        field: 'interest_type',
        allowNull: true,
        type: DataType.STRING,
    })
    declare interestType: string;

    @Column({
        field: 'transferable',
        allowNull: true,
        type: DataType.BOOLEAN,
    })
    declare transferable?: boolean;

    @Column({
        field: 'slot_uri',
        allowNull: true,
        type: DataType.STRING,
    })
    declare slotURI?: string;

    @Column({
        field: 'pool_id',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare poolId: string;
}