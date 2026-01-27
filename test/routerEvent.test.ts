import dotenv from 'dotenv';
import path from 'path';
import {routerEvent} from "../src/services/monitorService";
import {EventEvm} from "../src/types/event";
import {initSequelize} from "../src/lib/db";

require("../src/services/monitorService");

dotenv.config({path: path.resolve(__dirname, '../config/.env.local')});

describe('test router event', () => {
    test('BondCurrencyInfoHandler', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();
        try {
            const events = "[{\"id\": \"5406864\", \"eventId\": \"42161_0xa51144119e7cd15cb2fda2477bcd643b7064aa805d3170cd6c11145d38fc8e6b_9\", \"chainId\": 42161, \"blockNumber\": \"122465586\", \"blockHash\": \"0x94cf2a303b5da0badc6dcb5f8d934ddf25fa4543f0e1b3bf7fc1ea28c8a6aeee\", \"blockTimestamp\": \"1692328418\", \"transactionHash\": \"0xa51144119e7cd15cb2fda2477bcd643b7064aa805d3170cd6c11145d38fc8e6b\", \"transactionIndex\": 3, \"logIndex\": 9, \"contractAddress\": \"0x66e6b4c8aa1b8ca548cc4ebcd6f3a8c6f4f3d04d\", \"eventSignature\": \"0x98c0c4bde5f642566cdaebfb7cd2cdc72a98bc7f3440e38c19e1d58d92388d34\", \"indexedTopic1\": \"0x0000000000000000000000002f2a2543b76a4166549f7aab2e75bef0aefc5b0f\", \"indexedTopic2\": null, \"indexedTopic3\": null, \"data\": \"0x0000000000000000000000000000000000000000000000000000000000000001\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-27T08:27:03.913Z\", \"updatedAt\": \"2026-01-27T08:27:03.913Z\"}]";
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('BtcRedeemRecordHandler', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        const events = "[{\"id\": \"5406716\", \"eventId\": \"56_0x75495134d10bfc50fdb10988aa2d6f24656611c13793c68f77a4d1d759bd9d35_159\", \"chainId\": 56, \"blockNumber\": \"55281695\", \"blockHash\": \"0x9c80b09c492b8dc20dccfdb41acb2edd609857fceb215e68e1cb94f99eaacfd0\", \"blockTimestamp\": \"1753459230\", \"transactionHash\": \"0x75495134d10bfc50fdb10988aa2d6f24656611c13793c68f77a4d1d759bd9d35\", \"transactionIndex\": 43, \"logIndex\": 159, \"contractAddress\": \"0x30a61591c5bd3b5ae00d26f6b51c8ef0b9945baf\", \"eventSignature\": \"0x28f9c004bb654531eb47e83f5db427572a4c405c58cecd40317d0238b9ce109b\", \"indexedTopic1\": \"0x0000000000000000000000004aae823a6a0b376de6a78e74ecc5b079d38cbcf7\", \"indexedTopic2\": \"0x000000000000000000000000af6c50826143a6793d6ef2133dcc6d0e45fc8f68\", \"indexedTopic3\": null, \"data\": \"0x000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000000000006883aa1e000000000000000000000000000000000000000000000000000000000000002a626331716a7868666a6b326a6c797478376e336a737930746c7a35787370337039616b7878346b687a7200000000000000000000000000000000000000000000\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-26T09:24:44.684Z\", \"updatedAt\": \"2026-01-26T09:24:44.684Z\"}]";
        try {
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
});
