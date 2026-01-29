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
    test('Erc20TokenInfoHandler', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        try {
            const events = "[{\"blockHash\":\"0x921330942084d53e6c68709ce8528444e063ebdc12db34203640b04aa5edecb2\",\"blockNumber\":37393268,\"blockTimestamp\":1711717058,\"chainId\":56,\"contractAddress\":\"0x4aae823a6a0b376de6a78e74ecc5b079d38cbcf7\",\"createdAt\":\"2025-12-23T17:43:27.725908Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000006e550045436cf\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560x06adffc9e2c592be17fad6758e163e41af474f0b4cb8a7f815e590ebe46fcdfa516\",\"eventSignature\":\"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\",\"id\":30,\"indexedTopic1\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"indexedTopic2\":\"0x000000000000000000000000a83376174f44b06536b0f0ddba6da6f7e8fd3167\",\"indexedTopic3\":null,\"logIndex\":516,\"removed\":false,\"transactionHash\":\"0x06adffc9e2c592be17fad6758e163e41af474f0b4cb8a7f815e590ebe46fcdfa\",\"transactionIndex\":126,\"updatedAt\":\"2026-01-25T15:00:15.588379Z\"},{\"blockHash\":\"0x921330942084d53e6c68709ce8528444e063ebdc12db34203640b04aa5edecb2\",\"blockNumber\":37393268,\"blockTimestamp\":1711717058,\"chainId\":56,\"contractAddress\":\"0x4aae823a6a0b376de6a78e74ecc5b079d38cbcf7\",\"createdAt\":\"2025-12-23T17:43:27.725908Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000006e550045436cf\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560x06adffc9e2c592be17fad6758e163e41af474f0b4cb8a7f815e590ebe46fcdfa517\",\"eventSignature\":\"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\",\"id\":31,\"indexedTopic1\":\"0x000000000000000000000000a83376174f44b06536b0f0ddba6da6f7e8fd3167\",\"indexedTopic2\":\"0x0000000000000000000000003531386bada1ac1d9c36bb9364305e43f2ac87d7\",\"indexedTopic3\":null,\"logIndex\":517,\"removed\":false,\"transactionHash\":\"0x06adffc9e2c592be17fad6758e163e41af474f0b4cb8a7f815e590ebe46fcdfa\",\"transactionIndex\":126,\"updatedAt\":\"2026-01-25T15:00:15.588379Z\"}]";
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('MarketContractHandler', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        try {
            const events = "[{\"blockHash\":\"0xf539550032e5cb72a762ac45ab7bcec0d1439b7e7d19b858b4aefe99b2ca8b6c\",\"blockNumber\":36922999,\"blockTimestamp\":1710302693,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2026-01-25T12:11:19.928003Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560x0f765b4449868108aeb8b82dcefdc05b4e6522eb5aa02899ff9cae8670d31e1c635\",\"eventSignature\":\"0x3fa5066f0fb4156b71f7e02a60721543e6060fa3bde73bcd48b9cad43f7ed69b\",\"id\":7934404,\"indexedTopic1\":\"0x000000000000000000000000b816018e5d421e8b809a4dc01af179d86056ebdf\",\"indexedTopic2\":null,\"indexedTopic3\":null,\"logIndex\":635,\"removed\":false,\"transactionHash\":\"0x0f765b4449868108aeb8b82dcefdc05b4e6522eb5aa02899ff9cae8670d31e1c\",\"transactionIndex\":79,\"updatedAt\":\"2026-01-25T12:11:19.928003Z\"},{\"blockHash\":\"0x2e20595a2af7fc40f44f1a6c079ab9fb753f73047e45d9ca2f1322d123a2c0da\",\"blockNumber\":36923079,\"blockTimestamp\":1710302933,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2026-01-25T12:11:22.15273Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xa13f4f2b1599b188c7e8bf934ee2a48255594e82c892753d9df5d6086ad73a4413\",\"eventSignature\":\"0x3fa5066f0fb4156b71f7e02a60721543e6060fa3bde73bcd48b9cad43f7ed69b\",\"id\":7934485,\"indexedTopic1\":\"0x000000000000000000000000e16cec2f385ea7a382772334a44506a865f98562\",\"indexedTopic2\":null,\"indexedTopic3\":null,\"logIndex\":13,\"removed\":false,\"transactionHash\":\"0xa13f4f2b1599b188c7e8bf934ee2a48255594e82c892753d9df5d6086ad73a44\",\"transactionIndex\":5,\"updatedAt\":\"2026-01-25T12:11:22.15273Z\"},{\"blockHash\":\"0x55dccc447e836ba95e17377c2a9a971d9079cf84e2a223ddd69dc7d48d971905\",\"blockNumber\":36923104,\"blockTimestamp\":1710303008,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2026-01-25T12:11:23.741762Z\",\"data\":\"0x000000000000000000000000f8616d9e202f662b5c0c4cf40ec9ae39170948cd\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xf43e64ec6f76ad3455833332c896aa9c254f54ed2b430d455d93af072d9ce87a28\",\"eventSignature\":\"0x3fa5066f0fb4156b71f7e02a60721543e6060fa3bde73bcd48b9cad43f7ed69b\",\"id\":7934570,\"indexedTopic1\":\"0x000000000000000000000000744697899058b32d84506ad05dc1f3266603ab8a\",\"indexedTopic2\":null,\"indexedTopic3\":null,\"logIndex\":28,\"removed\":false,\"transactionHash\":\"0xf43e64ec6f76ad3455833332c896aa9c254f54ed2b430d455d93af072d9ce87a\",\"transactionIndex\":40,\"updatedAt\":\"2026-01-25T12:11:23.741762Z\"},{\"blockHash\":\"0x4251bd1191d3808d9385279681f80c93fda885bf72ccf3aece07a06188f2741c\",\"blockNumber\":36923117,\"blockTimestamp\":1710303047,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2026-01-25T12:11:24.489003Z\",\"data\":\"0x000000000000000000000000f8616d9e202f662b5c0c4cf40ec9ae39170948cd\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xe7c1b0398be7490f5c5ff7ad915391ce215368d5dc91ad39d66e80e5d4ea7ddd78\",\"eventSignature\":\"0x3fa5066f0fb4156b71f7e02a60721543e6060fa3bde73bcd48b9cad43f7ed69b\",\"id\":7934623,\"indexedTopic1\":\"0x000000000000000000000000aa295ff24c1130a4ceb07842860a8fd7cb9de9cd\",\"indexedTopic2\":null,\"indexedTopic3\":null,\"logIndex\":78,\"removed\":false,\"transactionHash\":\"0xe7c1b0398be7490f5c5ff7ad915391ce215368d5dc91ad39d66e80e5d4ea7ddd\",\"transactionIndex\":67,\"updatedAt\":\"2026-01-25T12:11:24.489003Z\"},{\"blockHash\":\"0xe0bebc5b63a8b887171edb9c0edf097c9541c121bf526dfaeb47186aa846d0ef\",\"blockNumber\":46050149,\"blockTimestamp\":1737731745,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2026-01-25T15:16:48.895596Z\",\"data\":\"0x000000000000000000000000f8616d9e202f662b5c0c4cf40ec9ae39170948cd\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560x5e914c036471befc9eb73fae036f04c14e07eb49d91a993e0d55e5d3922c6dfd176\",\"eventSignature\":\"0x3fa5066f0fb4156b71f7e02a60721543e6060fa3bde73bcd48b9cad43f7ed69b\",\"id\":8287193,\"indexedTopic1\":\"0x000000000000000000000000b816018e5d421e8b809a4dc01af179d86056ebdf\",\"indexedTopic2\":null,\"indexedTopic3\":null,\"logIndex\":176,\"removed\":false,\"transactionHash\":\"0x5e914c036471befc9eb73fae036f04c14e07eb49d91a993e0d55e5d3922c6dfd\",\"transactionIndex\":51,\"updatedAt\":\"2026-01-25T15:16:48.895596Z\"},{\"blockHash\":\"0x10b615ad13eea1c5ffb600294df858de41ab0d240da0eae01c3a6faa3f53fa49\",\"blockNumber\":46050175,\"blockTimestamp\":1737731823,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2026-01-25T15:16:50.767428Z\",\"data\":\"0x000000000000000000000000f8616d9e202f662b5c0c4cf40ec9ae39170948cd\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xe07b4bf55e843cd34e2caac6992e000503720e3a14f4554a1eded7f2e42c783c228\",\"eventSignature\":\"0x3fa5066f0fb4156b71f7e02a60721543e6060fa3bde73bcd48b9cad43f7ed69b\",\"id\":8287269,\"indexedTopic1\":\"0x000000000000000000000000e16cec2f385ea7a382772334a44506a865f98562\",\"indexedTopic2\":null,\"indexedTopic3\":null,\"logIndex\":228,\"removed\":false,\"transactionHash\":\"0xe07b4bf55e843cd34e2caac6992e000503720e3a14f4554a1eded7f2e42c783c\",\"transactionIndex\":108,\"updatedAt\":\"2026-01-25T15:16:50.767428Z\"}]";
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('NavHistoryPoolHandler', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        try {
            const events = "[{\"blockHash\":\"0x00c7f8851fcf33bcd3263f46fd11a8725b4182f4316faf459a9befdeeb61884a\",\"blockNumber\":37040909,\"blockTimestamp\":1710657761,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2025-12-23T15:37:13.899384Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000de0b6b3a7640000\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xa1b8a9bc30c6bf819cdf89a10efb22e65b18125902c02910bf85f0bee1a3d89e66\",\"eventSignature\":\"0x7761d390346f8b5de6eecd653e2bda9772f505e24d1c0d1fb5e9a3ecb6fea2c1\",\"id\":23,\"indexedTopic1\":\"0x8fc39cd137d7946ba4f529587d996d9445edbac4f1cd8054692ce395de553529\",\"indexedTopic2\":\"0x0000000000000000000000000000000000000000000000000000000065f690e1\",\"indexedTopic3\":null,\"logIndex\":66,\"removed\":false,\"transactionHash\":\"0xa1b8a9bc30c6bf819cdf89a10efb22e65b18125902c02910bf85f0bee1a3d89e\",\"transactionIndex\":40,\"updatedAt\":\"2026-01-25T12:54:43.914813Z\"},{\"blockHash\":\"0x00c7f8851fcf33bcd3263f46fd11a8725b4182f4316faf459a9befdeeb61884a\",\"blockNumber\":37040909,\"blockTimestamp\":1710657761,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2025-12-23T15:37:13.899384Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000de0b6b3a7640000\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xa1b8a9bc30c6bf819cdf89a10efb22e65b18125902c02910bf85f0bee1a3d89e67\",\"eventSignature\":\"0x12e00369dd43c5018a46bdeb5990bfb674b48542bb7e76e7c1b11f93cd78c76e\",\"id\":24,\"indexedTopic1\":\"0x8fc39cd137d7946ba4f529587d996d9445edbac4f1cd8054692ce395de553529\",\"indexedTopic2\":\"0xe27ae1f7b1161d7948c5735f15eafdde2d9822acb6f01f93b917d5e7622f6d43\",\"indexedTopic3\":null,\"logIndex\":67,\"removed\":false,\"transactionHash\":\"0xa1b8a9bc30c6bf819cdf89a10efb22e65b18125902c02910bf85f0bee1a3d89e\",\"transactionIndex\":40,\"updatedAt\":\"2026-01-25T12:54:43.914813Z\"},{\"blockHash\":\"0xd1ee0c00b832d69812f17436535fac0a3f70bbc2f35cd79b90b9e46e8906cc21\",\"blockNumber\":37066496,\"blockTimestamp\":1710734671,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2025-12-23T15:45:48.082087Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000de0b6b3a7640000\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xa3574c074e87f29b07f428517c3479a66a42a2f925c955e1a6f72a390ccc22ed231\",\"eventSignature\":\"0x7761d390346f8b5de6eecd653e2bda9772f505e24d1c0d1fb5e9a3ecb6fea2c1\",\"id\":26,\"indexedTopic1\":\"0x4034837a2beed533bd6760d8fe4cff634523af710de221d07b02e6a6aaf13e8d\",\"indexedTopic2\":\"0x0000000000000000000000000000000000000000000000000000000065f7bd4f\",\"indexedTopic3\":null,\"logIndex\":231,\"removed\":false,\"transactionHash\":\"0xa3574c074e87f29b07f428517c3479a66a42a2f925c955e1a6f72a390ccc22ed\",\"transactionIndex\":84,\"updatedAt\":\"2026-01-25T13:03:20.185018Z\"},{\"blockHash\":\"0xd1ee0c00b832d69812f17436535fac0a3f70bbc2f35cd79b90b9e46e8906cc21\",\"blockNumber\":37066496,\"blockTimestamp\":1710734671,\"chainId\":56,\"contractAddress\":\"0xae050694c137ad777611286c316e5fdda58242f3\",\"createdAt\":\"2025-12-23T15:45:48.082087Z\",\"data\":\"0x0000000000000000000000000000000000000000000000000de0b6b3a7640000\",\"dataSource\":\"QuickNodeStream\",\"eventId\":\"560xa3574c074e87f29b07f428517c3479a66a42a2f925c955e1a6f72a390ccc22ed232\",\"eventSignature\":\"0x12e00369dd43c5018a46bdeb5990bfb674b48542bb7e76e7c1b11f93cd78c76e\",\"id\":27,\"indexedTopic1\":\"0x4034837a2beed533bd6760d8fe4cff634523af710de221d07b02e6a6aaf13e8d\",\"indexedTopic2\":\"0xe6d54280a756548b796e16a7bfac7059a5f27c4cf2959fa94876bf7fd1a5cd27\",\"indexedTopic3\":null,\"logIndex\":232,\"removed\":false,\"transactionHash\":\"0xa3574c074e87f29b07f428517c3479a66a42a2f925c955e1a6f72a390ccc22ed\",\"transactionIndex\":84,\"updatedAt\":\"2026-01-25T13:03:20.185018Z\"}]";
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
});
