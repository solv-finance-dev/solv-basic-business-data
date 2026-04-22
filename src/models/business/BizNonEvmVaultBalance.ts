import {Column, DataType, Model, Sequelize, Table} from 'sequelize-typescript';

@Table({
    tableName: 'biz_non_evm_vault_balance',
    timestamps: true,
})
export default class BizNonEvmVaultBalance extends Model {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.BIGINT,
    })
    declare id: number;

    @Column({
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare chain: string;

    @Column({
        field: 'vault_name',
        type: DataType.STRING(128),
        allowNull: false,
    })
    declare vaultName: string;

    @Column({
        field: 'vault_address',
        type: DataType.STRING(128),
        allowNull: false,
    })
    declare vaultAddress: string;

    @Column({
        field: 'token_address',
        type: DataType.STRING(128),
        allowNull: false,
    })
    declare tokenAddress: string;

    @Column({
        field: 'token_decimals',
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare tokenDecimals: number;

    @Column({
        field: 'vault_balance',
        type: DataType.DECIMAL,
        allowNull: true,
    })
    declare vaultBalance?: string;

    @Column({
        field: 'created_at',
        type: DataType.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    })
    declare createdAt: Date;

    @Column({
        field: 'updated_at',
        type: DataType.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    })
    declare updatedAt: Date;

    @Column({
        field: 'currency_symbol',
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare currencySymbol: string;

    @Column({
        field: 'contract_address_type',
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare contractAddressType: string;
}
