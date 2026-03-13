import {getErc20Metadata, getTokenURI} from '../src/lib/rpc';

jest.setTimeout(180000);

describe('rpc', () => {
    test('getErc20Metadata', async () => {
        const metadata = await getErc20Metadata(56, '0x55d398326f99059ff775485246999027b3197955');
        console.log(metadata);
    });

    test('getTokenURI', async () => {
        const tokenURI = await getTokenURI(11155111, '0x1bda9d2d280054c5cf657b538751dd3bb88671e3', '734', 10424623);
        console.log(tokenURI);
    });
});
