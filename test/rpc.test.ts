import { getErc20Metadata } from '../src/lib/rpc';
import { loadJsonConfig } from '../src/lib/config';

describe('rpc', () => {
	test('getErc20Metadata', async () => {
		const metadata = await getErc20Metadata(56, '0x55d398326f99059ff775485246999027b3197955');
		console.log(metadata);
	});
});
