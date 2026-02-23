import {routerEventByIds} from "./services/monitorService";

const task = process.argv[2]

// https://us-west-2.console.aws.amazon.com/ecs/v2/clusters/solv-basic-business-data-cluster/run-task?region=us-west-2
// 1. Amazon Elastic Container Service > Clusters > solv-basic-business-data-cluster > Run task
// 2. Task definition family 选择：solv-basic-business-data-definitions:Latest
// 3. Cluster 选择：solv-basic-business-data-cluster
// 4. Container overrides > Command override : node build/fix.js routerEventByIds xxx
export async function main(task: string) {
    if (task === "routerEventByIds") {
        // node build/fix.js routerEventByIds 1,2,3
        // node build/fix.js routerEventByIds 1,2,3 [name] [handlerName]
        // node build/fix.js routerEventByIds 1,2,3 MarketInfo
        // node build/fix.js routerEventByIds 1,2,3 MarketInfo handleOpenFundMarketEvent
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
                handlerName: process.argv[5]
            }
        }
        await routerEventByIds(params, config)
    } else {
        console.error("Unknown task:", task)
        process.exit(1)
    }
}

main(task).catch(err => {
    console.error(err)
    process.exit(1)
})