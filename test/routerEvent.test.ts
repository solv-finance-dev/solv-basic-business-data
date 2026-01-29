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
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        // CreatePool(bytes32,address,address,((address,address,uint256,uint256),(uint16,address,uint64),(address,address,address),(uint256,uint256,uint256,uint64,uint64),address,address,address,uint64,bool,uint256))
        const events = "[{\"id\": \"5407239\", \"eventId\": \"42161_0xb339a12cbb2f700746dab0e8a5e418395d491a69dc255c19e4f214a924d53b92_8\", \"chainId\": 42161, \"blockNumber\": \"113081585\", \"blockHash\": \"0x93d733421defffb2f36947f7c6a4862ba9d8f15444af646460e6574b28f03491\", \"blockTimestamp\": \"1689842633\", \"transactionHash\": \"0xb339a12cbb2f700746dab0e8a5e418395d491a69dc255c19e4f214a924d53b92\", \"transactionIndex\": 2, \"logIndex\": 8, \"contractAddress\": \"0x629ad7bc14726e9cea4fcb3a7b363d237bb5dbe8\", \"eventSignature\": \"0x5e8804df0ac02a5694ee0287778f997115710435eba0d5abada9a27bb00b93b4\", \"indexedTopic1\": \"0x375ebcd78e8b3571c0f6482bdaae602672e73e145e92ca40f9b8f1537236bf2e\", \"indexedTopic2\": \"0x000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9\", \"indexedTopic3\": \"0x00000000000000000000000022799daa45209338b7f938edf251bdfd1e6dcb32\", \"data\": \"0x00000000000000000000000022799daa45209338b7f938edf251bdfd1e6dcb32000000000000000000000000e9bd233b2b34934fb83955ec15c2ac48f31a0e8c38032f1e88ff149a19997f36df02ff8e159336809a1b2265454c0fba952ef88a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000078cb3134758dbae79923c22b34c0343648492a230000000000000000000000000000000000000000000000000000000064c1b38000000000000000000000000036362fdb21630d51060e33637876e0c14ccf7dd5000000000000000000000000a743ccf2556c5660a826a9a1ac35c2eb5ef71114000000000000000000000000a743ccf2556c5660a826a9a1ac35c2eb5ef711140000000000000000000000000000000000000000000000000000003a352944000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000064b8f2cf0000000000000000000000000000000000000000000000000000000077905980000000000000000000000000a743ccf2556c5660a826a9a1ac35c2eb5ef71114000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb90000000000000000000000006ec1fec6c6af53624733f671b490b8250ff251ed0000000000000000000000000000000000000000000000000000000064c1b38000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-29T06:17:53.818Z\", \"updatedAt\": \"2026-01-29T06:17:53.818Z\"}]";
        // UpdatePoolInfo(bytes32,uint16,address,uint256,uint256,address,address)"
        // const events = "[{\"id\": \"5407242\", \"eventId\": \"42161_0xfeb59459792ffc992c58578baafb10746ea2366cc8e17e67c3af57163148c775_1\", \"chainId\": 42161, \"blockNumber\": \"152790232\", \"blockHash\": \"0x082e36d0b90911e2e43fbbfbbcaa85faf8e2f13efd4c2454c48c43af963cafa4\", \"blockTimestamp\": \"1700618048\", \"transactionHash\": \"0xfeb59459792ffc992c58578baafb10746ea2366cc8e17e67c3af57163148c775\", \"transactionIndex\": 1, \"logIndex\": 1, \"contractAddress\": \"0x629ad7bc14726e9cea4fcb3a7b363d237bb5dbe8\", \"eventSignature\": \"0x1677fef1586e6288d5a413be495fb5ced02047b20eb36cfd7669e61cfcfa9dcf\", \"indexedTopic1\": \"0xe037ef7b5f74bf3c988d8ae8ab06ad34643749ba9d217092297241420d600fce\", \"indexedTopic2\": null, \"indexedTopic3\": null, \"data\": \"0x00000000000000000000000000000000000000000000000000000000000009c400000000000000000000000078cb3134758dbae79923c22b34c0343648492a230000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000003eebfac5b51ff51c82f0856dad42750d581d74830000000000000000000000009f6478a876d7765f44bda712573820eb3ae389fb\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-29T06:58:06.466Z\", \"updatedAt\": \"2026-01-29T06:58:06.466Z\"}]";
        try {
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('CarryInfoHandler.ts', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        const events = "[{\"id\": \"5407245\", \"eventId\": \"1_0xa31ab1c2946ac7b22b93f1d47f45e133e4717ea3000df30946c7541f2acb3ff8_672\", \"chainId\": 1, \"blockNumber\": \"19461968\", \"blockHash\": \"0x8259a2411461dea1d07f602769af2aea870558dcf1c980d79863b9691417bc89\", \"blockTimestamp\": \"1710768419\", \"transactionHash\": \"0xa31ab1c2946ac7b22b93f1d47f45e133e4717ea3000df30946c7541f2acb3ff8\", \"transactionIndex\": 364, \"logIndex\": 672, \"contractAddress\": \"0x57bb6a8563a8e8478391c79f3f433c6ba077c567\", \"eventSignature\": \"0xd595e96e192644463bfb4c98d31b6047a34346508489deadee0f83d0eeba24ec\", \"indexedTopic1\": \"0x75c4ef0cc642bb65d7ef0b8ac6600f34abc7f27ba0e17cbe89e7657e5daa541a\", \"indexedTopic2\": \"0xbd58d3af4a7848cbe34fedda652b5d2c47374b906fb39f60dda145cd2d2aa469\", \"indexedTopic3\": null, \"data\": \"0x000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000000\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-29T07:09:56.731Z\", \"updatedAt\": \"2026-01-29T07:09:56.731Z\"}]";
        try {
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('NavRecordsHandler.ts', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        // SetRedeemNav && SetSubscribeNav
        const events = "[{\"id\": \"5407273\", \"eventId\": \"42161_0x2e4d8759193e5e2f46ede327c00e7386c16cacb64c60e5ab6782391d767550f1_14\", \"chainId\": 42161, \"blockNumber\": \"121185470\", \"blockHash\": \"0xb01b61ae93f8fd751fcdf4ed0271225f4ac381293d91f46a9af802e2b04a4e05\", \"blockTimestamp\": \"1691984002\", \"transactionHash\": \"0x2e4d8759193e5e2f46ede327c00e7386c16cacb64c60e5ab6782391d767550f1\", \"transactionIndex\": 1, \"logIndex\": 14, \"contractAddress\": \"0x629ad7bc14726e9cea4fcb3a7b363d237bb5dbe8\", \"eventSignature\": \"0x12e00369dd43c5018a46bdeb5990bfb674b48542bb7e76e7c1b11f93cd78c76e\", \"indexedTopic1\": \"0x375ebcd78e8b3571c0f6482bdaae602672e73e145e92ca40f9b8f1537236bf2e\", \"indexedTopic2\": \"0x522151ba14d739622fccfc456cec01dca5faf5f0742bfc805d7ad11a0aba4c0f\", \"indexedTopic3\": null, \"data\": \"0x00000000000000000000000000000000000000000000000000000000000fb725\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-29T07:54:11.042Z\", \"updatedAt\": \"2026-01-29T07:54:11.042Z\"}, {\"id\": \"5407272\", \"eventId\": \"42161_0x2e4d8759193e5e2f46ede327c00e7386c16cacb64c60e5ab6782391d767550f1_13\", \"chainId\": 42161, \"blockNumber\": \"121185470\", \"blockHash\": \"0xb01b61ae93f8fd751fcdf4ed0271225f4ac381293d91f46a9af802e2b04a4e05\", \"blockTimestamp\": \"1691984002\", \"transactionHash\": \"0x2e4d8759193e5e2f46ede327c00e7386c16cacb64c60e5ab6782391d767550f1\", \"transactionIndex\": 1, \"logIndex\": 13, \"contractAddress\": \"0x629ad7bc14726e9cea4fcb3a7b363d237bb5dbe8\", \"eventSignature\": \"0x7761d390346f8b5de6eecd653e2bda9772f505e24d1c0d1fb5e9a3ecb6fea2c1\", \"indexedTopic1\": \"0x375ebcd78e8b3571c0f6482bdaae602672e73e145e92ca40f9b8f1537236bf2e\", \"indexedTopic2\": \"0x0000000000000000000000000000000000000000000000000000000064d9a082\", \"indexedTopic3\": null, \"data\": \"0x00000000000000000000000000000000000000000000000000000000000fb725\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-29T07:54:11.042Z\", \"updatedAt\": \"2026-01-29T07:54:11.042Z\"}]";
        try {
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('ProtocolFeeCollectorHistoryHandler.ts', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        const events = "[{\"id\": \"5407284\", \"eventId\": \"42161_0x3723eba85a84162709635fc4264fdda02b1a7e1d8daa2772d68bb8f5b3b67c99_0\", \"chainId\": 42161, \"blockNumber\": \"123423136\", \"blockHash\": \"0x9840a2bc577b9cfda4f70d6ea034d5ce1691ae00217526671d935aa3622d3181\", \"blockTimestamp\": \"1692588949\", \"transactionHash\": \"0x3723eba85a84162709635fc4264fdda02b1a7e1d8daa2772d68bb8f5b3b67c99\", \"transactionIndex\": 1, \"logIndex\": 0, \"contractAddress\": \"0x629ad7bc14726e9cea4fcb3a7b363d237bb5dbe8\", \"eventSignature\": \"0xd14a872b3c2506b548b78b31d3336d5cf5cae0db9641d742da52dd397fb1e2c0\", \"indexedTopic1\": null, \"indexedTopic2\": null, \"indexedTopic3\": null, \"data\": \"0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004dd7cf38a249a371a8e589bc1c44485bc791d3f\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-29T08:29:16.506Z\", \"updatedAt\": \"2026-01-29T08:29:16.506Z\"}]";
        try {
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
    test('ProtocolFeeInfoHandler.ts', async () => {
        const sequelize = await initSequelize();
        const transaction = await sequelize.transaction();

        const events = "[{\"id\": \"5407298\", \"eventId\": \"42161_0x7d5b8afee6672c6e4ce336ad216c71212d556d618c5308b02a75424f44b72908_12\", \"chainId\": 42161, \"blockNumber\": \"123824018\", \"blockHash\": \"0x11b261bb99a977432455981ff08b6157c6ab36683a0d9667692733be2fa7bfe3\", \"blockTimestamp\": \"1692698122\", \"transactionHash\": \"0x7d5b8afee6672c6e4ce336ad216c71212d556d618c5308b02a75424f44b72908\", \"transactionIndex\": 3, \"logIndex\": 12, \"contractAddress\": \"0x629ad7bc14726e9cea4fcb3a7b363d237bb5dbe8\", \"eventSignature\": \"0xa45ad11a8f07c35f34f99d383133ff3d9de1f51286e14db3b6be8a4667fccb01\", \"indexedTopic1\": \"0x375ebcd78e8b3571c0f6482bdaae602672e73e145e92ca40f9b8f1537236bf2e\", \"indexedTopic2\": null, \"indexedTopic3\": null, \"data\": \"0x000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb90000000000000000000000000000000000000000000000000000000001c1e181\", \"removed\": false, \"dataSource\": \"QuickNodeStream\", \"createdAt\": \"2026-01-29T08:49:02.775Z\", \"updatedAt\": \"2026-01-29T08:49:02.775Z\"}]";
        try {
            await routerEvent(JSON.parse(events) as EventEvm[], transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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
});
