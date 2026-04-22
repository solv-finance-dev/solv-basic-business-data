import {Column, DataType, Model, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_sale_redeem',
    timestamps: true,
})
export default class BizSaleRedeem extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
    })
    declare id: number;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare chainId: number;

    @Column({
        field: 'contract_address',
        type: DataType.STRING(66),
        allowNull: false,
    })
    declare contractAddress: string;

    @Column({
        field: 'token_id',
        type: DataType.STRING(128),
    })
    declare tokenId: string;

    @Column({
        field: 'tx_hash',
        type: DataType.STRING(66),
        allowNull: false,
    })
    declare txHash: string;

    @Column({
        field: 'block_timestamp',
        type: DataType.BIGINT,
    })
    declare blockTimestamp: number;

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
        field: 'from_address',
        type: DataType.STRING(66),
    })
    declare fromAddress: string;

    @Column({
        field: 'to_address',
        type: DataType.STRING(66),
    })
    declare toAddress: string;

    @Column({
        type: DataType.DECIMAL(78, 0),
    })
    declare amount: string;

    @Column({
        type: DataType.INTEGER,
    })
    declare decimals: number;

    @Column({
        field: 'currency_address',
        type: DataType.STRING(66),
    })
    declare currencyAddress: string;

    @Column({
        field: 'currency_symbol',
        type: DataType.STRING(32),
    })
    declare currencySymbol: string;

    @Column({
        field: 'currency_decimals',
        type: DataType.INTEGER,
    })
    declare currencyDecimals: number;

    @Column({
        type: DataType.STRING(128),
    })
    declare slot: string;

    @Column({
        field: 'transaction_type',
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare transactionType: string;

    @Column({
        field: 'product_type',
        type: DataType.STRING(32),
    })
    declare productType: string;

    @Column({
        field: 'sft_symbol',
        type: DataType.STRING(32),
    })
    declare sftSymbol: string;

    @Column({
        type: DataType.STRING(128),
    })
    declare nav: string;

    @Column({
        field: 'pool_id',
        type: DataType.STRING(128),
    })
    declare poolId: string;

    @Column({
        field: 'block_number',
        type: DataType.BIGINT,
    })
    declare blockNumber: number;

    @Column({
        field: 'last_updated',
        type: DataType.BIGINT,
    })
    declare lastUpdated: number;

    @Column({
        field: 'created_at',
        type: DataType.DATE,
        defaultValue: Sequelize.literal('NOW()'),
    })
    declare createdAt: Date;

    @Column({
        field: 'updated_at',
        type: DataType.DATE,
        defaultValue: Sequelize.literal('NOW()'),
    })
    declare updatedAt: Date;
}
