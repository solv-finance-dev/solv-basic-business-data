import {Contract} from 'ethers';
import {getRpcProvider} from './rpc';

export async function getBtcTvlFromChainlink(chainId: number, contractAddress: string): Promise<string> {
    const provider = getRpcProvider(chainId);
    const ABI = [`function latestAnswer() external view returns (int256)`];

    try {
        const contract = new Contract(contractAddress, ABI, provider);
        const result = await contract.latestAnswer();
        console.log(`[Chainlink] ${chainId}:${contractAddress} = ${result.toString()}`);
        return result.toString();
    } catch (e) {
        console.error(`[Chainlink] Error reading ${chainId}:${contractAddress}`, e);
        // Note: legacy returns `return 0` (number). Intentionally changed to `'0'` (string)
        // to keep return type consistent. BigNumber handles both number and string.
        return '0';
    }
}

export async function getNavFromChainlink(chainId: number, contractAddress: string): Promise<string> {
    return await getBtcTvlFromChainlink(chainId, contractAddress);
}
