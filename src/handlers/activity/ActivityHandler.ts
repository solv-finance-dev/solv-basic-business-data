import type { HandlerParam } from '../../types/handler';
import { handleTransferValue, handleTransfer } from './subHandler/erc3525';
import {
	handleCreatePool,
	handleUpdateFundraisingEndTime,
	handleSubscribe,
	handleRequestRedeem,
	handleRevokeRedeem,
	handleCloseRedeemSlot,
} from './subHandler/openFundMarket';
import { handleClaim, handleRepay } from './subHandler/openFundRedemption';
import { handleClaim as handleShareClaim, handleRepay as handleShareRepay, handleSetInterestRate } from './subHandler/openFundShare';

// ==================== 事件签名常量 ====================

const ERC3525_EVENT_SIGNATURES = {
	TRANSFER_VALUE: 'TransferValue(uint256,uint256,uint256)',
	TRANSFER: 'Transfer(address,address,uint256)',
} as const;

const OPEN_FUND_MARKET_EVENT_SIGNATURES = {
	CREATE_POOL: 'CreatePool(indexed bytes32,indexed address,indexed address,((address,address,uint256,uint256),(uint16,address,uint64),(address,address,address),(uint256,uint256,uint256,uint64,uint64),address,address,address,uint64,bool,uint256))',
	UPDATE_FUNDRAISING_END_TIME: 'UpdateFundraisingEndTime(indexed bytes32,uint64,uint64)',
	SUBSCRIBE: 'Subscribe(indexed bytes32,indexed address,uint256,uint256,address,uint256,uint256)',
	CLOSE_REDEEM_SLOT: 'CloseRedeemSlot(indexed bytes32,uint256,uint256)',
	REQUEST_REDEEM: 'RequestRedeem(indexed bytes32,indexed address,indexed uint256,uint256,uint256)',
	REVOKE_REDEEM: 'RevokeRedeem(indexed bytes32,indexed address,indexed uint256,uint256)',
} as const;

const OPEN_FUND_REDEMPTION_EVENT_SIGNATURES = {
	CLAIM: 'Claim(address,uint256,uint256,address,uint256)',
	REPAY: 'Repay(uint256,address,address,uint256)',
} as const;

const OPEN_FUND_SHARE_EVENT_SIGNATURES = {
	CLAIM: 'Claim(address,uint256,uint256)',
	REPAY: 'Repay(uint256,address,uint256)',
	SET_INTEREST_RATE: 'SetInterestRate(uint256,int32)',
} as const;

const SFT_WRAPPED_ROUTER_EVENT_SIGNATURES = {
} as const;

const SOLV_BTC_ROUTER_V2_EVENT_SIGNATURES = {
} as const;

const X_SOLV_BTC_POOL_EVENT_SIGNATURES = {
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

export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
	const { event, transaction, eventFunc, args } = param;

	try {
		// 根据事件签名路由到对应的处理函数
		switch (eventFunc) {
			case OPEN_FUND_MARKET_EVENT_SIGNATURES.CREATE_POOL:
				await handleCreatePool(event, args, transaction);
				break;

			case OPEN_FUND_MARKET_EVENT_SIGNATURES.UPDATE_FUNDRAISING_END_TIME:
				await handleUpdateFundraisingEndTime(event, args, transaction);
				break;

			case OPEN_FUND_MARKET_EVENT_SIGNATURES.SUBSCRIBE:
				await handleSubscribe(event, args, transaction);
				break;

			case OPEN_FUND_MARKET_EVENT_SIGNATURES.CLOSE_REDEEM_SLOT:
				await handleCloseRedeemSlot(event, args, transaction);
				break;

			case OPEN_FUND_MARKET_EVENT_SIGNATURES.REQUEST_REDEEM:
				await handleRequestRedeem(event, args, transaction);
				break;

			case OPEN_FUND_MARKET_EVENT_SIGNATURES.REVOKE_REDEEM:
				await handleRevokeRedeem(event, args, transaction);
				break;

			default:
				console.warn('ActivityHandler: handleOpenFundMarketEvent: unhandled event signature', {
					eventFunc,
					eventId: event.eventId,
				});
		}
	} catch (error) {
		console.error('ActivityHandler: handleOpenFundMarketEvent failed', {
			eventFunc,
			eventId: event.eventId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function handleOpenFundRedemptionDelegateEvent(param: HandlerParam): Promise<void> {
	const { event, transaction, eventFunc, args } = param;

	try {
		// 根据事件签名路由到对应的处理函数
		switch (eventFunc) {
			case OPEN_FUND_REDEMPTION_EVENT_SIGNATURES.CLAIM:
				await handleClaim(event, args, transaction);
				break;

			case OPEN_FUND_REDEMPTION_EVENT_SIGNATURES.REPAY:
				await handleRepay(event, args, transaction);
				break;

			default:
				console.warn('ActivityHandler: handleOpenFundRedemptionDelegateEvent: unhandled event signature', {
					eventFunc,
					eventId: event.eventId,
				});
		}
	} catch (error) {
		console.error('ActivityHandler: handleOpenFundRedemptionDelegateEvent failed', {
			eventFunc,
			eventId: event.eventId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function handleOpenShareDelegateEvent(param: HandlerParam): Promise<void> {
	const { event, transaction, eventFunc, args } = param;

	try {
		// 根据事件签名路由到对应的处理函数
		switch (eventFunc) {
			case OPEN_FUND_SHARE_EVENT_SIGNATURES.CLAIM:
				await handleShareClaim(event, args, transaction);
				break;

			case OPEN_FUND_SHARE_EVENT_SIGNATURES.REPAY:
				await handleShareRepay(event, args, transaction);
				break;

			case OPEN_FUND_SHARE_EVENT_SIGNATURES.SET_INTEREST_RATE:
				await handleSetInterestRate(event, args, transaction);
				break;

			default:
				console.warn('ActivityHandler: handleOpenShareDelegateEvent: unhandled event signature', {
					eventFunc,
					eventId: event.eventId,
				});
		}
	} catch (error) {
		console.error('ActivityHandler: handleOpenShareDelegateEvent failed', {
			eventFunc,
			eventId: event.eventId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function handleSftWrappedRouterEvent(param: HandlerParam): Promise<void> {
}

export async function handleSolvBTCRouterV2Event(param: HandlerParam): Promise<void> {
}

export async function handleXSolvBTCPoolEvent(param: HandlerParam): Promise<void> {
}
