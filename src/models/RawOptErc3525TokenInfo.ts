import {Table, Column, Model, Sequelize, PrimaryKey, AutoIncrement, DataType} from 'sequelize-typescript';

@Table({
    tableName: 'test_raw_opt_erc3525_token_info',
    timestamps: true,
})
export default class OptRawErc3525TokenInfo extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({type: DataType.BIGINT})
    declare id: number;

    // @Column({
    // 	field: 'contract_info_id',
    // 	type: DataType.BIGINT,
    // })
    // declare contractInfoId: number;

    @Column({
        field: 'chain_id',
        type: DataType.INTEGER,
    })
    declare chainId: number;

    @Column({
        field: 'contract_address',
        type: DataType.STRING(64),
    })
    declare contractAddress: string;

    @Column({
        field: 'token_id',
        type: DataType.STRING(64),
    })
    declare tokenId: string;

    @Column({
        type: DataType.STRING(128),
    })
    declare slot: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL,
    })
    declare balance?: string;

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    declare holder?: string;

    @Column({
        field: 'mint_time',
        allowNull: true,
        type: DataType.INTEGER,
    })
    declare mintTime?: number;

    @Column({
        field: 'is_burned',
        allowNull: true,
        type: DataType.INTEGER,
        defaultValue: Sequelize.literal('0'),
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
        type: DataType.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    })
    declare createdAt?: Date;

    @Column({
        field: 'updated_at',
        type: DataType.DATE,
    })
    declare updatedAt?: Date;

    @Column({
        field: 'token_uri',
        type: DataType.STRING,
    })
    declare tokenURI?: string;
}