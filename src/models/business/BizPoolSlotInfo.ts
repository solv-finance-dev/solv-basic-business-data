import {
    BelongsTo,
    Column,
    DataType,
    ForeignKey,
    HasOne,
    Model,
    Sequelize,
    Table
} from 'sequelize-typescript';
import BizCurrencyInfo from './BizCurrencyInfo';
import BizPoolOrderInfo from './BizPoolOrderInfo';

@Table({
    tableName: 'biz_pool_slot_info',
    timestamps: true,
})
export default class BizPoolSlotInfo extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
        defaultValue: Sequelize.literal("nextval('biz_pool_slot_info_id_seq'::regclass)"),
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

    @ForeignKey(() => BizCurrencyInfo)
    @Column({
        field: 'currency_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare currencyId?: number;

    @BelongsTo(() => BizCurrencyInfo)
    declare currencyInfo: BizCurrencyInfo;

    @HasOne(() => BizPoolOrderInfo)
    declare poolOrderInfo: BizPoolOrderInfo;

    @Column({
        field: 'currency_symbol',
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare currencySymbol?: string;

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
        field: 'subtype',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare subtype?: string;

    @Column({
        field: 'yield_type',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare yieldType?: string;
}
