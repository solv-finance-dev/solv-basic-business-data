import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_repay_info_open_end',
    timestamps: true,
})
export default class RawOptRepayInfoOpenEnd extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
    })
    declare id: number;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
        comment: '链id,Ethereum,BSC,polygon ...',
    })
    declare chainId: number;

    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare slot?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
        comment: '还款人地址',
    })
    declare address?: string;

    @Column({
        field: 'repaid_value',
        allowNull: true,
        type: DataType.DECIMAL,
        comment: '还款金额',
    })
    declare repaidValue?: string;

    @Column({
        field: 'repay_date',
        allowNull: true,
        type: DataType.BIGINT,
        comment: '还款日期',
    })
    declare repayDate?: number;

    @Column({
        field: 'currency_symbol',
        allowNull: true,
        type: DataType.STRING(16),
    })
    declare currencySymbol?: string;

    @Column({
        field: 'currency_price',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare currencyPrice?: string;

    @Column({
        field: 'tx_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare txHash?: string;

    @Column({
        field: 'transaction_index',
        type: DataType.INTEGER,
    })
    declare transactionIndex: number;

    @Column({
        field: 'event_index',
        type: DataType.INTEGER,
    })
    declare eventIndex: number;

    @Column({
        field: 'repay_type',
        allowNull: true,
        type: DataType.STRING(32),
        comment: 'Normal, Liquidation',
    })
    declare repayType?: string;

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
        field: 'last_updated',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare lastUpdated?: number;
}
