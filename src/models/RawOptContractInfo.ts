import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_contract_info',
    timestamps: true,
})
export default class RawOptContractInfo extends Model {
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
        field: 'contract_type',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare contractType?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare name?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare symbol?: string;

    @Column({
        field: 'total_supply',
        allowNull: true,
        type: DataType.BIGINT,
    })
    declare totalSupply?: number;

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

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

    @Column({
        field: 'contract_uri',
        allowNull: true,
        type: DataType.TEXT,
    })
    declare contractUri?: string;
}
