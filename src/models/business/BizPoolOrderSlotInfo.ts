import {Column, DataType, Model, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_pool_order_slot_info',
    timestamps: true,
})
export default class BizPoolOrderSlotInfo extends Model {
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
    declare latestProtocolFeeSettleTime?: string;

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
    })
    declare currency?: string;

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
    })
    declare permissionless?: boolean;

    @Column({
        field: 'pool_status',
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare poolStatus?: string;

    @Column({
        field: 'currency_symbol',
        allowNull: true,
        type: DataType.STRING(10),
    })
    declare currencySymbol?: string;

    @Column({
        field: 'coupon_rate',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare couponRate?: string;

    @Column({
        field: 'maturity_date',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare maturityDate?: number;

    @Column({
        field: 'payoff_date',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare payoffDate?: number;

    @Column({
        field: 'is_interest_rate_set',
        allowNull: true,
        type: DataType.BOOLEAN,
    })
    declare isInterestRateSet?: boolean;

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
