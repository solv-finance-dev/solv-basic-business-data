import {Model, Table, Column, DataType, Sequelize} from 'sequelize-typescript';

@Table({
    tableName: 'test_currency_info',
    timestamps: true,
})
export default class CurrencyInfo extends Model {
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
        field: 'currency_address',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare currencyAddress?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(16),
    })
    declare symbol?: string;

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare decimals?: number;

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

    @Column({
        field: 'is_stablecoin',
        allowNull: true,
        type: DataType.BOOLEAN,
    })
    declare isStablecoin?: boolean;
}
