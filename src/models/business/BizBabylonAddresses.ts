import {AutoIncrement, Column, DataType, Model, PrimaryKey, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_babylon_addresses',
    timestamps: true,
})
export default class BizBabylonAddresses extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({type: DataType.BIGINT})
    declare id: number;

    @Column({
        field: 'btc_address',
        type: DataType.STRING,
    })
    declare btcAddress: string;

    @Column({
        field: 'balance',
        type: DataType.DECIMAL,
    })
    declare balance: string;

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
