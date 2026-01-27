import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_xsolvbtc_transaction_info',
    timestamps: true,
})
export default class XSolvBTCTransactionInfo extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
    })
    declare id?: string;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare chainId?: number;

    @Column({
        field: 'contract_address',
        type: DataType.STRING(64),
        allowNull: true,
    })
    declare contractAddress?: string;

    @Column({
        field: 'tx_hash',
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare txHash?: string;

    @Column({
        field: 'block_number',
        type: DataType.BIGINT,
        allowNull: true,
    })
    declare blockNumber?: string;

    @Column({
        field: 'block_timestamp',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare blockTimestamp?: number;

    @Column({
        field: 'transaction_index',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare transactionIndex?: number;

    @Column({
        field: 'event_index',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare eventIndex?: number;

    @Column({
        field: 'from_address',
        type: DataType.STRING(64),
        allowNull: true,
    })
    declare fromAddress?: string;

    @Column({
        field: 'to_address',
        type: DataType.STRING(64),
        allowNull: true,
    })
    declare toAddress?: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare decimals?: number;

    @Column({
        field: 'transaction_type',
        type: DataType.STRING(32),
        allowNull: true,
    })
    declare transactionType?: string;

    @Column({
        field: 'solvbtc_amount',
        type: DataType.DECIMAL,
        allowNull: true,
    })
    declare solvbtcAmount?: string;

    @Column({
        field: 'xsolvbtc_amount',
        type: DataType.DECIMAL,
        allowNull: true,
    })
    declare xsolvbtcAmount?: string;

    @Column({
        field: 'last_updated',
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare lastUpdated?: number;

    @Column({
        field: 'created_at',
        type: DataType.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    })
    declare createdAt?: Date;

    @Column({
        field: 'updated_at',
        type: DataType.DATE,
    })
    declare updatedAt?: Date;
}