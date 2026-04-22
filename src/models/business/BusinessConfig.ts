import {AutoIncrement, Column, DataType, Model, PrimaryKey, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'business_config',
    timestamps: true,
})
export default class BusinessConfig extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({type: DataType.BIGINT})
    declare id: number;

    // Unique configuration key
    @Column({
        field: 'key',
        type: DataType.STRING(64),
        allowNull: false,
        unique: true,
    })
    declare key: string;

    // Configuration title
    @Column({
        field: 'title',
        type: DataType.STRING(120),
        allowNull: true,
    })
    declare title: string | null;

    // Configuration data in JSON format
    @Column({
        field: 'config',
        type: DataType.JSONB,
        allowNull: false,
    })
    declare config: any;

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