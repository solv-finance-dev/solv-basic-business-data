import {routerEventByIds} from '../../services/monitorService';

interface RouterEventConfig {
    name: string;
    handlerName?: string;
}

// 根据event_evm表里的主键id列表，路由事件到对应的处理器（注意：多个chainId对应的ids，会报错）
export async function routeByIds(ids: number[]): Promise<void> {
    await routerEventByIds(ids);
}

export async function routeByConfig(
    params: {
        ids: number[],
        config: RouterEventConfig
    }
): Promise<void> {
    const {ids, config} = params;
    await routerEventByIds(ids, config);
}
