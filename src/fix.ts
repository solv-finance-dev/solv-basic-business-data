import {routerEventByBlock, routerEventByIds} from "./services/monitorService";
import {getRedisClient} from "./lib/redis";
import {setLastSyncedBlock} from "./data/evmSyncState";
import {getChainConfigs, getLatestEventBlockNumber} from "./services/evmService";
import {getRawSequelize} from "./lib/dbClient";
import {CurrencyInfo} from "@solvprotocol/models";
import {sendSNS} from "./lib/sns";

const FIX_BLOCK_BATCH_SIZE = 200;

const task = process.argv[2]

// https://us-west-2.console.aws.amazon.com/ecs/v2/clusters/solv-basic-business-data-cluster/run-task?region=us-west-2
// 1. Amazon Elastic Container Service > Clusters > solv-basic-business-data-cluster > Run task
// 2. Task definition family 选择：solv-basic-business-data-definitions:Latest
// 3. Cluster 选择：solv-basic-business-data-cluster
// 4. Container overrides > Command override : node build/fix.js routerEventByIds xxx
// Command example like: 需要一行一个指令(涉及多个以逗号分割的，可以用""引号包起)
// node
// build/fix.js
// routerEventByIds
// "6082949,6082950"
export async function main(task: string) {
    console.log('Starting fix task:', task);
    const redisClient = await getRedisClient();

    if (task === 'routerEventByIds') {
        // node build/fix.js routerEventByIds 1,2,3
        // node build/fix.js routerEventByIds 1,2,3 [name] [handlerName]
        // node build/fix.js routerEventByIds 1,2,3 MarketInfo
        // node build/fix.js routerEventByIds 12204949 Activity handleErc20TokenInfoEvent
        // node build/fix.js routerEventByIds 12204949,12204949 Erc20TokenInfo handleErc20TokenInfoEvent
        let params: number[] = []
        try {
            params = process.argv[3].split(',').map((id: string) => Number(id))
        } catch (e) {
            console.error("Invalid event ids:", process.argv[3])
            process.exit(1)
        }
        let config: any;
        if (process.argv[4]) {
            config = {
                name: process.argv[4]
            }
        }
        if (process.argv[5]) {
            config = {
                name: config?.name,
                handlerName: process.argv[5]
            }
        }
        await routerEventByIds(params, config);
    } else if (task === 'routerEventBlock') {
        // node build/fix.js routerEventBlock [chainId] [startBlockNumber] [endBlockNumber] [name] [handlerName]
        const chainId = Number(process.argv[3]);
        const startBlockNumber = Number(process.argv[4]);
        const inputEndBlockNumber = Number(process.argv[5]);

        if (!Number.isFinite(chainId)) {
            console.error('Invalid chainId for routerEventBlock:', process.argv[3]);
            process.exit(1);
        }
        if (!Number.isFinite(startBlockNumber) || startBlockNumber < 1) {
            console.error('Invalid startBlockNumber for routerEventBlock:', process.argv[4]);
            process.exit(1);
        }
        if (!Number.isFinite(inputEndBlockNumber) || inputEndBlockNumber < 1) {
            console.error('Invalid endBlockNumber for routerEventBlock:', process.argv[5]);
            process.exit(1);
        }
        if (inputEndBlockNumber <= startBlockNumber) {
            console.error('routerEventBlock requires endBlockNumber greater than startBlockNumber.', {
                startBlockNumber,
                endBlockNumber: inputEndBlockNumber,
            });
            process.exit(1);
        }

        let config: any;
        if (process.argv[6]) {
            config = {
                name: process.argv[6]
            }
        }
        if (process.argv[7]) {
            config = {
                name: config?.name,
                handlerName: process.argv[7]
            }
        }

        const latestBlockNumber = await getLatestEventBlockNumber(chainId);
        if (latestBlockNumber === null) {
            console.error(`routerEventBlock failed to get latest block number for chainId=${chainId}`);
            process.exit(1);
        }
        if (latestBlockNumber < startBlockNumber) {
            console.error(`routerEventBlock latest block number is less than startBlockNumber, chainId=${chainId}, latestBlockNumber=${latestBlockNumber}, startBlockNumber=${startBlockNumber}`);
            process.exit(1);
        }

        const endBlockNumber = Math.min(inputEndBlockNumber, latestBlockNumber);
        console.log(`routerEventBlock start, chainId=${chainId}, startBlockNumber=${startBlockNumber}, endBlockNumber=${endBlockNumber}, latestBlockNumber=${latestBlockNumber}, batchSize=${FIX_BLOCK_BATCH_SIZE}`);

        for (let batchStart = startBlockNumber; batchStart <= endBlockNumber; batchStart += FIX_BLOCK_BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + FIX_BLOCK_BATCH_SIZE - 1, endBlockNumber);
            console.log(`routerEventBlock processing batch, chainId=${chainId}, batchStart=${batchStart}, batchEnd=${batchEnd}`);
            try {
                const count = await routerEventByBlock(chainId, batchStart, batchEnd, config);
                console.log(`routerEventBlock batch success, chainId=${chainId}, batchStart=${batchStart}, batchEnd=${batchEnd}, eventCount=${count}`);
            } catch (error) {
                console.error(`routerEventBlock batch failed, chainId=${chainId}, batchStart=${batchStart}, batchEnd=${batchEnd}`, error);
                throw error;
            }
        }
    } else if (task === 'monitorSwitch') {
        // node build/fix.js monitorSwitch {stop|start} chainId
        // node build/fix.js monitorSwitch start 1
        // node build/fix.js monitorSwitch stop 1

        // 紧急停止 chainId
        if (process.argv[3] != 'start' && process.argv[3] != 'stop') {
            console.error("Missing params for monitorSwitch")
            return;
        }
        if (!process.argv[4]) {
            console.error("Missing chainId for monitorSwitch")
            return;
        }
        const action = process.argv[3];
        const chainId = Number(process.argv[4]);
        if (isNaN(chainId)) {
            console.error("Invalid chainId for monitorSwitch:", process.argv[4])
            return;
        }
        const value = action === 'stop' ? '1' : '0';
        const res = await redisClient.set('StopMonitorChainId_' + chainId, value);
        console.log(`Monitor switch set for chainId:${chainId} action:${action} result:${res}`);
    } else if (task === 'chainHeightSet') {
        // node build/fix.js chainHeightSet 1 12345678
        // node build/fix.js chainHeightSet {chainId} {height}
        if (!process.argv[4]) {
            console.error("Missing height for chainHeightSet");
            return;
        }
        const setChainId = Number(process.argv[3]);
        const height = Number(process.argv[4]);
        if (isNaN(setChainId) || isNaN(height)) {
            console.error("Invalid params for chainHeightSet:", process.argv[3], process.argv[4])
            return;
        }
        await setLastSyncedBlock(setChainId, height);
        console.log('Chain height set for chainId', setChainId, 'height:', height)
    } else if (task === 'checkHealth') {
        const chains = getChainConfigs();
        for (const chain of chains) {
            const key = `StopMonitorChainId_${chain.chainId}`;
            const value = await redisClient.get(key);
            console.log(`Monitor switch status: chainId=${chain.chainId} key=${key} value=${value}`);
        }

        await getRawSequelize();
        const currencyInfo = await CurrencyInfo.findOne();
        console.log(`DB health check: CurrencyInfo first record id=${currencyInfo?.id ?? 'null'}`);
    } else if (task === 'testSNS') {
        // 发送测试SNS通知
        await sendSNS("This is a test SNS message from fix task", "Test SNS Notification");
        console.log("Test SNS message sent");
    } else {
        console.error("Unknown task:", task)
    }
}

main(task)
    .then(() => {
        console.log("Fix task completed")
        process.exit(0)
    })
    .catch(err => {
        console.error(err)
        process.exit(1)
    });
