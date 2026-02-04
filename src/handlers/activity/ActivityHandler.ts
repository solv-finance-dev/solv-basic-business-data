import type { HandlerParam } from '../../types/handler';
import { handleTransferValue, handleTransfer } from './erc3525';

// ==================== 事件签名常量 ====================

const ERC3525_EVENT_SIGNATURES = {
    TRANSFER_VALUE: 'TransferValue(uint256,uint256,uint256)',
    TRANSFER: 'Transfer(address,address,uint256)',
} as const;

// ==================== 主处理函数 ====================

export async function handleErc3525Event(param: HandlerParam): Promise<void> {
    const { event, transaction, eventFunc, args } = param;

    try {
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case ERC3525_EVENT_SIGNATURES.TRANSFER_VALUE:
                await handleTransferValue(event, args, transaction);
                break;

            case ERC3525_EVENT_SIGNATURES.TRANSFER:
                await handleTransfer(event, args, transaction);
                break;

            default:
                console.warn('ActivityHandler: handleErc3525Event: unhandled event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('ActivityHandler: handleErc3525Event failed', {
            eventFunc,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
