import {AutoIncrement, Column, DataType, Model, PrimaryKey, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_contract_info',
    timestamps: true,
})
export default class BizContractInfo extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({type: DataType.BIGINT})
    declare id: number;

    @Column({
        field: 'contract_address',
        type: DataType.STRING(64),
    })
    declare contractAddress: string;

    @Column({
        field: 'contract_type',
        allowNull: true,
        type: DataType.STRING(32),
    })
    declare contractType?: string;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
    })
    declare chainId: number;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare name?: string;

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

    @Column({
        allowNull: true,
        type: DataType.STRING(16),
    })
    declare symbol?: string;

    @Column({
        field: 'total_supply',
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare totalSupply?: string;

    @Column({
        field: 'last_updated',
        type: DataType.INTEGER,
    })
    declare lastUpdated: number;

    @Column({
        field: 'contract_uri',
        type: DataType.STRING,
    })
    declare contractURI: string;

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
