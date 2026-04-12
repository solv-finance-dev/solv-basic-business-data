import {AutoIncrement, Column, DataType, Model, PrimaryKey, Sequelize, Table} from 'sequelize-typescript';

@Table({tableName: 'por_data_history', timestamps: true})
export default class PorDataHistory extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({type: DataType.BIGINT})
    declare id: number;

    @Column({field: 'asset_name', type: DataType.STRING(32), allowNull: false})
    declare assetName: string;

    @Column({type: DataType.DECIMAL(78, 18), allowNull: false})
    declare amount: string;

    @Column({type: DataType.DECIMAL(78, 18), allowNull: true})
    declare nav: string | null;

    @Column({field: 'snapshot_time', type: DataType.BIGINT, allowNull: false})
    declare snapshotTime: number;

    @Column({field: 'created_at', type: DataType.DATE, defaultValue: Sequelize.literal('NOW()')})
    declare createdAt: Date;

    @Column({field: 'updated_at', type: DataType.DATE, defaultValue: Sequelize.literal('NOW()')})
    declare updatedAt: Date;
}
