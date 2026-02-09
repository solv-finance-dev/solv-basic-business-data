import type { HandlerParam } from '../../types/handler';
import type { Transaction } from 'sequelize';
import RawOptActivity from '../../models/RawOptActivity';
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
import { handleSftWrappedTokenTransfer } from './subHandler/sftWrappedToken';

// ==================== 事件签名常量 ====================

const ERC3525_EVENT_SIGNATURES = {
	TRANSFER_VALUE: 'TransferValue(uint256,uint256,uint256)',
	TRANSFER: 'Transfer(address,address,uint256)',
} as const;

const OPEN_FUND_MARKET_EVENT_SIGNATURES = {
	CREATE_POOL: 'CreatePool(bytes32,address,address,((address,address,uint256,uint256),(uint16,address,uint64),(address,address,address),(uint256,uint256,uint256,uint64,uint64),address,address,address,uint64,bool,uint256))',
	UPDATE_FUNDRAISING_END_TIME: 'UpdateFundraisingEndTime(bytes32,uint64,uint64)',
	SUBSCRIBE: 'Subscribe(bytes32,address,uint256,uint256,address,uint256,uint256)',
	CLOSE_REDEEM_SLOT: 'CloseRedeemSlot(bytes32,uint256,uint256)',
	REQUEST_REDEEM: 'RequestRedeem(bytes32,address,uint256,uint256,uint256)',
	REVOKE_REDEEM: 'RevokeRedeem(bytes32,address,uint256,uint256)',
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

const SFT_WRAPPED_TOKEN_EVENT_SIGNATURES = {
    TRANSFER: 'Transfer(address,address,uint256)',
} as const;

const SOLV_BTC_ROUTER_V2_EVENT_SIGNATURES = {
} as const;

const X_SOLV_BTC_POOL_EVENT_SIGNATURES = {
} as const;

// ==================== 类型定义 ====================

export interface ActivityCreationParams {
	chainId: number;
	contractAddress: string;
	tokenId: string;
	txHash: string;
	timestamp: number;
	transactionIndex: number;
	eventIndex: number;
	fromAddress: string;
	toAddress: string;
	amount: string;
	decimals: number;
	currencyAddress: string;
	currencySymbol: string;
	currencyDecimals: number;
	slot: string;
	transactionType: string;
	productType: string;
	nav: string;
	poolId: string;
	blockNumber: number;
	transaction: Transaction;
}

// ==================== Activity 创建函数 ====================
export async function createActivity(params: ActivityCreationParams): Promise<void> {
	try {
		const [activity, created] = await RawOptActivity.findOrCreate({
			where: {
				txHash: params.txHash,
				transactionIndex: params.transactionIndex,
				eventIndex: params.eventIndex,
			},
			defaults: {
				chainId: params.chainId,
				contractAddress: params.contractAddress.toLowerCase(),
				tokenId: params.tokenId,
				txHash: params.txHash,
				blockTimestamp: params.timestamp,
				transactionIndex: params.transactionIndex,
				eventIndex: params.eventIndex,
				fromAddress: params.fromAddress.toLowerCase(),
				toAddress: params.toAddress.toLowerCase(),
				amount: params.amount,
				decimals: params.decimals,
				currencySymbol: params.currencySymbol,
				currencyDecimals: params.currencyDecimals,
				slot: params.slot,
				transactionType: params.transactionType,
				nav: params.nav,
				poolId: params.poolId.toLowerCase(),
				blockNumber: params.blockNumber,
				lastUpdated: params.timestamp,
				productType: params.productType,
			},
			transaction: params.transaction,
		});
	} catch (error) {
		console.error('ActivityHandler: Failed to create Activity', {
			chainId: params.chainId,
			contractAddress: params.contractAddress,
			tokenId: params.tokenId,
			transactionType: params.transactionType,
			txHash: params.txHash,
			transactionIndex: params.transactionIndex,
			eventIndex: params.eventIndex,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

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

export async function handleOpenFundRedemptionEvent(param: HandlerParam): Promise<void> {
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
				console.warn('ActivityHandler: handleOpenFundRedemptionEvent: unhandled event signature', {
					eventFunc,
					eventId: event.eventId,
				});
		}
	} catch (error) {
		console.error('ActivityHandler: handleOpenFundRedemptionEvent failed', {
			eventFunc,
			eventId: event.eventId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function handleOpenFundShareEvent(param: HandlerParam): Promise<void> {
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
				console.warn('ActivityHandler: handleOpenFundShareEvent: unhandled event signature', {
					eventFunc,
					eventId: event.eventId,
				});
		}
	} catch (error) {
		console.error('ActivityHandler: handleOpenFundShareEvent failed', {
			eventFunc,
			eventId: event.eventId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function handleSftWrappedRouterEvent(param: HandlerParam): Promise<void> {
}

export async function handleSftWrappedTokenEvent(param: HandlerParam): Promise<void> {
    const {event, transaction, eventFunc, args} = param;

    try {
        switch (eventFunc) {
            case SFT_WRAPPED_TOKEN_EVENT_SIGNATURES.TRANSFER:
                await handleSftWrappedTokenTransfer(event, args, transaction);
                break;

            default:
                console.warn('ActivityHandler: handleSftWrappedTokenEvent: unhandled event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('ActivityHandler: handleSftWrappedTokenEvent failed', {
            eventFunc,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function handleSolvBTCRouterV2Event(param: HandlerParam): Promise<void> {
}

export async function handleXSolvBTCPoolEvent(param: HandlerParam): Promise<void> {
}
