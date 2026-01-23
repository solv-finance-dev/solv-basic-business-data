import type {HandlerParam} from '../types/handler';

export async function handleEvent(param: HandlerParam): Promise<void> {
	const event = param.event;
	console.log('SampleHandler: received event ', JSON.stringify({
		eventId: event.eventId,
		chainId: event.chainId,
		contractAddress: event.contractAddress,
		eventSignature: event.eventSignature,
	}));
}
