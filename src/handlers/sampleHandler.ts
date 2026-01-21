import { EventEvm } from '../types/event';

export async function handleEvent(event: EventEvm): Promise<void> {
	console.log('SampleHandler: received event ', JSON.stringify({
		eventId: event.eventId,
		chainId: event.chainId,
		contractAddress: event.contractAddress,
		eventSignature: event.eventSignature,
	}));
}
