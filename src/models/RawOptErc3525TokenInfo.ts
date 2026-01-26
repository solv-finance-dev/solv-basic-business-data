import {Model, Table, Column, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_erc3525_token_info',
    timestamps: true,
})
export default class RawOptErc3525TokenInfo extends Model {
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
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare holder?: string;

    @Column({
        field: 'token_id',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare tokenId?: string;

    @Column({
        field: 'product_type',
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare productType?: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare balance?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    declare slot?: string;

    @Column({
        field: 'mint_time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare mintTime?: number;

    @Column({
        field: 'is_burned',
        allowNull: true,
        type: DataType.SMALLINT,
    })
    declare isBurned?: number;

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
        field: 'token_uri',
        allowNull: true,
        type: DataType.TEXT,
    })
    declare tokenUri?: string;
}
