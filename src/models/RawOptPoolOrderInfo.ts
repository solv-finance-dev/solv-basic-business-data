import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_pool_order_info',
    timestamps: true,
})
export default class RawOptPoolOrderInfo extends Model {
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
        field: 'market_contract_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare marketContractAddress?: string;

    @Column({
        field: 'contract_address',
        allowNull: true,
        type: DataType.STRING(64),
        comment: '转成小写写入',
    })
    declare contractAddress?: string;

    @Column({
        field: 'pool_id',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare poolId?: string;

    @Column({
        field: 'open_fund_share',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare openFundShare?: string;

    @Column({
        field: 'open_fund_redemption',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare openFundRedemption?: string;

    @Column({
        field: 'open_fund_share_slot',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare openFundShareSlot?: string;

    @Column({
        field: 'latest_redeem_slot',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare latestRedeemSlot?: string;

    @Column({
        field: 'carry_rate',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare carryRate?: string;

    @Column({
        field: 'carry_collector',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare carryCollector?: string;

    @Column({
        field: 'latest_protocol_fee_settle_time',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare latestProtocolFeeSettleTime?: number;

    @Column({
        field: 'pool_manager',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare poolManager?: string;

    @Column({
        field: 'subscribe_nav_manager',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare subscribeNavManager?: string;

    @Column({
        field: 'redeem_nav_manager',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare redeemNavManager?: string;

    @Column({
        field: 'hard_cap',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare hardCap?: string;

    @Column({
        field: 'subscribe_min',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare subscribeMin?: string;

    @Column({
        field: 'subscribe_max',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare subscribeMax?: string;

    @Column({
        field: 'fundraising_start_time',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare fundraisingStartTime?: number;

    @Column({
        field: 'fundraising_end_time',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare fundraisingEndTime?: number;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare vault?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
        comment: '币种address',
    })
    declare currency?: string;

    @Column({
        field: 'currency_decimals',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare currencyDecimals?: number;

    @Column({
        field: 'nav_oracle',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare navOracle?: string;

    @Column({
        field: 'value_date',
        allowNull: true,
        type: DataType.BIGINT,
        comment: '起息日',
    })
    declare valueDate?: number;

    @Column({
        field: 'fundraising_amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare fundraisingAmount?: string;

    @Column({
        allowNull: true,
        type: DataType.BOOLEAN,
        comment: '是否有白名单',
    })
    declare permissionless?: boolean;

    @Column({
        field: 'pool_status',
        allowNull: true,
        type: DataType.STRING(32),
        comment: 'Active,Removed,Closed',
    })
    declare poolStatus?: string;

    @Column({
        field: 'tx_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare txHash?: string;

    @Column({
        field: 'high_watermark',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '最新的nav',
    })
    declare highWatermark?: string;

    @Column({
        field: 'total_value',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '当前份额',
    })
    declare totalValue?: string;

    @Column({
        field: 'average_cost',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '持仓成本',
    })
    declare averageCost?: string;

    @Column({
        field: 'handle_status',
        allowNull: true,
        type: DataType.STRING(128),
        comment: '勾兑状态',
    })
    declare handleStatus?: string;

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
}
