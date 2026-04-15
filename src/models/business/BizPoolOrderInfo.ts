import {
    BelongsTo,
    Column,
    DataType,
    ForeignKey,
    Model,
    Sequelize,
    Table
} from 'sequelize-typescript';
import BizPoolSlotInfo from './BizPoolSlotInfo';

@Table({
    tableName: 'biz_pool_order_info',
    timestamps: true,
})
export default class BizPoolOrderInfo extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
        defaultValue: Sequelize.literal("nextval('biz_pool_order_info_id_seq'::regclass)"),
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
        type: DataType.STRING,
    })
    declare poolId?: string;

    @ForeignKey(() => BizPoolSlotInfo)
    @Column({
        field: 'pool_slot_info_id',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare poolSlotInfoId?: number;

    @BelongsTo(() => BizPoolSlotInfo)
    declare poolSlotInfo: BizPoolSlotInfo;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare vault?: string;

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
}
