import dotenv from 'dotenv';
import path from 'path';
import { routerEvent } from "../src/services/monitorService";
import { EventEvm } from "../src/types/event";
import { initSequelize, closeSequelize } from "../src/lib/db";

require("../src/services/monitorService");

dotenv.config({ path: path.resolve(__dirname, '../config/.env.local') });

// 设置测试超时时间为 60 秒
jest.setTimeout(60000);

describe('test router event', () => {
    // 测试结束后清理资源
    afterAll(async () => {
        await closeSequelize();
    });

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
    test('CarryCollectorHistoryHandler.ts', async () => {
        // Wait for testing
    });
    test('CarryInfoHandler.ts', async () => {
        // Wait for testing
    });
    test('NavRecordsHandler.ts', async () => {
        // Wait for testing
    });
    test('ProtocolFeeCollectorHistoryHandler.ts', async () => {
        // Wait for testing
    });
    test('ProtocolFeeInfoHandler.ts', async () => {
        // Wait for testing
    });
    test('ContractInfoHandler', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        try {
            const events = "[{\"id\":\"7\",\"eventId\":\"56_0x9322b5696d1b70fa2af07a853a328bc31ea768dd11249c6c327fd693e543a2ce_58\",\"chainId\":56,\"blockNumber\":\"36923075\",\"blockHash\":\"0xda5fafbf6aa59f0b54e32f9b46c274cb0d7483bc84dd07467301fa9b83990717\",\"blockTimestamp\":\"1710302921\",\"transactionHash\":\"0x9322b5696d1b70fa2af07a853a328bc31ea768dd11249c6c327fd693e543a2ce\",\"transactionIndex\":14,\"logIndex\":58,\"contractAddress\":\"0x5531f96bb9e9559ae9880cc0109e06ef477aef8e\",\"eventSignature\":\"0x6ec857c6ca1ae8448b8fa03c99fffa6d43899fd913f1af415e37176918c1de7a\",\"indexedTopic1\":\"0x1576f7154264e4a3dcf9bd9080f21f449cca63e97ad164c3aa524cff20b2116b\",\"indexedTopic2\":\"0x40982f4251c6782bbb5f053d28580ef2574702dd27fb8085804f554096f80a19\",\"indexedTopic3\":null,\"data\":\"0x000000000000000000000000e16cec2f385ea7a382772334a44506a865f98562\",\"removed\":false,\"dataSource\":\"QuickNodeStream\",\"createdAt\":\"2025-11-19 00:00:59.705342+00\",\"updatedAt\":\"2025-11-19 00:00:59.705342+00\"}]";
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('Erc3525TokenInfoHandler', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        try {
            const events = "[{\"blockHash\":\"0x3ef1739497df5da961652ff2508827cc04af1baceff33826a89ccb931613ec81\",\"blockNumber\":45864340,\"blockTimestamp\":1737174307,\"chainId\":56,\"contractAddress\":\"0xe16cec2f385ea7a382772334a44506a865f98562\",\"createdAt\":\"2026-01-25T12:11:22.800899Z\",\"data\":\"0x\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560x49f85dcb6559151ba8d47e3748b3329a6c414a72fc6f8905240ab453ff2f7811296\",\"eventSignature\":\"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\",\"id\":7934506,\"indexedTopic1\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"indexedTopic2\":\"0x00000000000000000000000067035877f5c12202c387d1698274c2abf28f3678\",\"indexedTopic3\":\"0x00000000000000000000000000000000000000000000000000000000000022cf\",\"logIndex\":296,\"removed\":false,\"transactionHash\":\"0x49f85dcb6559151ba8d47e3748b3329a6c414a72fc6f8905240ab453ff2f7811\",\"transactionIndex\":71,\"updatedAt\":\"2026-01-25T12:11:22.800899Z\"},{\"blockHash\":\"0x3ef1739497df5da961652ff2508827cc04af1baceff33826a89ccb931613ec81\",\"blockNumber\":45864340,\"blockTimestamp\":1737174307,\"chainId\":56,\"contractAddress\":\"0xe16cec2f385ea7a382772334a44506a865f98562\",\"createdAt\":\"2026-01-25T12:11:22.800899Z\",\"data\":\"0x000000000000000000000000000000000000000000000000003c6568f12e8000\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560x49f85dcb6559151ba8d47e3748b3329a6c414a72fc6f8905240ab453ff2f7811298\",\"eventSignature\":\"0x0b2aac84f3ec956911fd78eae5311062972ff949f38412e8da39069d9f068cc6\",\"id\":7934508,\"indexedTopic1\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"indexedTopic2\":\"0x00000000000000000000000000000000000000000000000000000000000022cf\",\"indexedTopic3\":null,\"logIndex\":298,\"removed\":false,\"transactionHash\":\"0x49f85dcb6559151ba8d47e3748b3329a6c414a72fc6f8905240ab453ff2f7811\",\"transactionIndex\":71,\"updatedAt\":\"2026-01-25T12:11:22.800899Z\"}]";
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
});
