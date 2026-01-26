import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_xsolvbtc_transaction_info',
    timestamps: true,
})
export default class XsolvbtcTransactionInfo extends Model {
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
        field: 'contract_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare contractAddress?: string;

    @Column({
        field: 'tx_hash',
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare txHash?: string;

    @Column({
        field: 'block_number',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare blockNumber?: number;

    @Column({
        field: 'block_timestamp',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare blockTimestamp?: number;

    @Column({
        field: 'transaction_index',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare transactionIndex?: number;

    @Column({
        field: 'event_index',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare eventIndex?: number;

    @Column({
        field: 'from_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare fromAddress?: string;

    @Column({
        field: 'to_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare toAddress?: string;

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

    @Column({
        field: 'transaction_type',
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare transactionType?: string;

    @Column({
        field: 'solvbtc_amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare solvbtcAmount?: string;

    @Column({
        field: 'xsolvbtc_amount',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare xsolvbtcAmount?: string;

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
