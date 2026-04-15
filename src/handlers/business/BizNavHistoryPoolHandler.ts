import type { HandlerParam } from '../../types/handler';
import { getBusinessSequelize } from '../../lib/dbClient';
import NavHistoryPool from '../../models/business/BizNavHistoryPool';

const NAV_TYPE = {
	INVESTMENT: 'Investment',
	REDEMPTION: 'Redemption',
} as const;

interface EventInfo {
	poolId: string;
	nav: string;
	timestamp: number;
}

function extractEventInfo(event: any, args: Record<string, unknown>): EventInfo {
	return {
		poolId: String(args.poolId ?? ''),
		nav: String(args.nav ?? ''),
		timestamp: event.blockTimestamp,
	};
}

function validateEventData(poolId: string, nav: string, time?: number): void {
	if (!poolId) {
		throw new Error('NavHistoryPoolHandler: poolId is required');
	}
	if (!nav) {
		throw new Error('NavHistoryPoolHandler: nav is required');
	}
	if (time !== undefined && time <= 0) {
		throw new Error('NavHistoryPoolHandler: time must be positive');
	}
}

async function upsertNavHistoryPool(poolId: string, navType: string, navDate: string, nav: string): Promise<void> {
	const [record, created] = await NavHistoryPool.findOrCreate({
		where: {
			poolId,
			navType,
			navDate,
		},
		defaults: {
			poolId,
			nav,
			navType,
			navDate,
		},
	});

	if (!created) {
		await record.update({ nav });
	}
}

async function handleSetRedeemNavEvent(param: HandlerParam): Promise<void> {
	const { event, args } = param;

	await getBusinessSequelize();

	const eventInfo = extractEventInfo(event, args);
	validateEventData(eventInfo.poolId, eventInfo.nav, eventInfo.timestamp);

	const navDate = new Date(eventInfo.timestamp * 1000).toISOString().slice(0, 10);

	await upsertNavHistoryPool(eventInfo.poolId, NAV_TYPE.REDEMPTION, navDate, eventInfo.nav);
	await upsertNavHistoryPool(eventInfo.poolId, NAV_TYPE.INVESTMENT, navDate, eventInfo.nav);
}

async function handleSetSubscribeNavEvent(param: HandlerParam): Promise<void> {
	const { event, args } = param;

	await getBusinessSequelize();

	const eventInfo = extractEventInfo(event, args);
	const time = Number(args.time ?? 0);

	validateEventData(eventInfo.poolId, eventInfo.nav, time);

	const navDate = new Date(time * 1000).toISOString().slice(0, 10);

	await upsertNavHistoryPool(eventInfo.poolId, NAV_TYPE.INVESTMENT, navDate, eventInfo.nav);
}

export async function handleNavHistoryPoolEvent(param: HandlerParam): Promise<void> {
	const { eventFunc } = param;

	if (eventFunc === 'SetSubscribeNav(bytes32,uint256,uint256)') {
		await handleSetSubscribeNavEvent(param);
	} else if (eventFunc === 'SetRedeemNav(bytes32,uint256,uint256)') {
		await handleSetRedeemNavEvent(param);
	}
}
