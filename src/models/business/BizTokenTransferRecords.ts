import {Column, DataType, Model, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_token_transfer_records',
    timestamps: true,
    updatedAt: false,
})
export default class BizTokenTransferRecords extends Model {
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
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare symbol: string;

    @Column({
        field: 'tx_hash',
        type: DataType.STRING(66),
        allowNull: false,
    })
    declare txHash: string;

    @Column({
        field: 'block_number',
        type: DataType.BIGINT,
        allowNull: false,
    })
    declare blockNumber: number;

    @Column({
        field: 'log_index',
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare logIndex: number;

    @Column({
        field: 'from_address',
        type: DataType.STRING(66),
        allowNull: false,
    })
    declare fromAddress: string;

    @Column({
        field: 'to_address',
        type: DataType.STRING(66),
        allowNull: false,
    })
    declare toAddress: string;

    @Column({
        type: DataType.DECIMAL(78, 0),
        allowNull: false,
    })
    declare amount: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 18,
    })
    declare decimals: number;

    @Column({
        field: 'block_timestamp',
        type: DataType.BIGINT,
    })
    declare blockTimestamp: number;

    @Column({
        field: 'created_at',
        type: DataType.DATE,
        defaultValue: Sequelize.literal('NOW()'),
    })
    declare createdAt: Date;
}
