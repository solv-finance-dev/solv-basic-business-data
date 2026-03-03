import type { HandlerParam } from '../../types/handler';
import {RawOptContractInfo} from "@solvprotocol/models";
import {Erc3525TokenInfo as OptRawErc3525TokenInfo} from "@solvprotocol/models";
import { getSlotOf, getOwnerOf, getTokenURI } from '../../lib/rpc';
import { sendQueueMessage } from '../../lib/sqs';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_TOKEN_ID = '0';

// 大数运算辅助函数
function addBigInt(a: string, b: string): string {
    return (BigInt(a) + BigInt(b)).toString();
}

function subBigInt(a: string, b: string): string {
    return (BigInt(a) - BigInt(b)).toString();
}

// 查询 TokenInfo 的辅助函数
async function findTokenInfo(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    transaction: any
): Promise<OptRawErc3525TokenInfo | null> {
    return await OptRawErc3525TokenInfo.findOne({
        where: {
            chainId,
            contractAddress: contractAddress.toLowerCase(),
            tokenId,
        },
        transaction,
    });
}

// 安全获取 slot（链上调用失败或 token 无效时返回 '0'）
async function getSlotSafe(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    logPrefix: string
): Promise<string> {
    try {
        const slot = await getSlotOf(chainId, contractAddress, tokenId);
        // getSlotOf 在 token 无效时会返回 null
        return slot || '0';
    } catch (error) {
        console.warn(`${logPrefix}: Failed to get slotOf`, { contractAddress, tokenId, error });
        return '0';
    }
}

// 安全获取 owner（链上调用失败时返回 NULL_ADDRESS）
async function getOwnerSafe(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    logPrefix: string
): Promise<string> {
    try {
        return await getOwnerOf(chainId, contractAddress, tokenId);
    } catch (error) {
        console.warn(`${logPrefix}: Failed to get ownerOf`, { contractAddress, tokenId, error });
        return NULL_ADDRESS;
    }
}

// 安全获取 tokenURI（链上调用失败时返回空字符串）
async function getTokenURISafe(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    logPrefix: string
): Promise<string> {
    try {
        return await getTokenURI(chainId, contractAddress, tokenId);
    } catch (error) {
        console.warn(`${logPrefix}: Failed to get tokenURI`, { contractAddress, tokenId, error });
        return '';
    }
}

// 统一更新 RawOptContractInfo 并发送 SQS
async function updateContractInfoAndSendSQS(
    contractInfo: RawOptContractInfo,
    updateData: {
        totalSupply?: string;
        lastUpdated?: number;
    },
    transaction: any
): Promise<void> {
    await contractInfo.update(updateData, { transaction });

    try {
        await sendQueueMessage(contractInfo.chainId, 'configQueue', {
            source: 'V3_5_Raw_Contract_Info',
            data: {
                id: Number(contractInfo.id),
                chainId: String(contractInfo.chainId),
                contractAddress: contractInfo.contractAddress,
            },
        });
    } catch (error) {
        console.error('Erc3525TokenInfoHandler: Failed to send SQS message for updated contract info', {
            id: contractInfo.id,
            chainId: contractInfo.chainId,
            contractAddress: contractInfo.contractAddress,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// 统一更新 OptRawErc3525TokenInfo 并发送 SQS
async function updateTokenInfoAndSendSQS(
    erc3525tokenInfo: OptRawErc3525TokenInfo,
    updateData: {
        balance?: string;
        slot?: string;
        holder?: string;
        tokenURI?: string;
        lastUpdated?: number;
        isBurned?: number;
    },
    chainId: number,
    contractAddress: string,
    transaction: any
): Promise<void> {
    await erc3525tokenInfo.update(updateData, { transaction });

    try {
        await sendQueueMessage(chainId, 'assetQueue', {
            source: 'V3_5_Raw_Asset_Info',
            data: {
                id: Number(erc3525tokenInfo.id),
                chainId: String(chainId),
                contractAddress: contractAddress,
            },
        });
    } catch (error) {
        console.error('Erc3525TokenInfoHandler: Failed to send SQS message for updated token info', {
            id: erc3525tokenInfo.id,
            chainId,
            contractAddress,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// 处理 TransferValue 事件
async function handleTransferValue(
    event: any,
    args: Record<string, unknown>,
    transaction: any
): Promise<void> {
    const contractAddress = event.contractAddress.toLowerCase();
    const fromTokenId = String(args._fromTokenId ?? '');
    const toTokenId = String(args._toTokenId ?? '');
    const value = String(args._value ?? '');
    const timestamp = event.blockTimestamp;

    // 如果 fromTokenId 不为 0，处理源 token
    let slot = '';
    if (fromTokenId !== ZERO_TOKEN_ID) {
        const fromTokenInfo = await findTokenInfo(event.chainId, contractAddress, fromTokenId, transaction);
        if (!fromTokenInfo) {
            console.warn(`Erc3525TokenInfoHandler: TokenInfo not found for fromTokenId ${fromTokenId}`);
            return;
        }

        // 减少余额并发送 SQS
        const balance = fromTokenInfo.balance || '0';
        const newBalance = subBigInt(balance, value);
        await updateTokenInfoAndSendSQS(
            fromTokenInfo,
            {
                balance: newBalance,
                lastUpdated: timestamp,
            },
            event.chainId,
            contractAddress,
            transaction
        );

        slot = fromTokenInfo.slot || '0';
    }

    // 如果 toTokenId 不为 0，处理目标 token
    if (toTokenId !== ZERO_TOKEN_ID) {
        // 如果 slot 为空，从链上获取
        if (!slot || slot === '0') {
            slot = await getSlotSafe(event.chainId, event.contractAddress, toTokenId, 'Erc3525TokenInfoHandler');
        }

        // 获取 owner
        const owner = await getOwnerSafe(event.chainId, event.contractAddress, toTokenId, 'Erc3525TokenInfoHandler');

        // 查询目标 token 信息
        const toTokenInfo = await findTokenInfo(event.chainId, contractAddress, toTokenId, transaction);
        if (!toTokenInfo) {
            console.warn(`Erc3525TokenInfoHandler: TokenInfo not found for toTokenId ${toTokenId}`);
            return;
        }

        // 增加余额
        const balance = toTokenInfo.balance || '0';
        const newBalance = addBigInt(balance, value);

        // 获取 tokenURI
        const tokenURI = await getTokenURISafe(event.chainId, event.contractAddress, toTokenId, 'Erc3525TokenInfoHandler');

        // 更新目标 token 信息并发送 SQS
        await updateTokenInfoAndSendSQS(
            toTokenInfo,
            {
                balance: newBalance,
                lastUpdated: timestamp,
                slot,
                holder: owner.toLowerCase(),
                tokenURI,
            },
            event.chainId,
            contractAddress,
            transaction
        );

        // 如果 fromTokenId 不为 0，也需要更新其 slot 并发送 SQS
        if (fromTokenId !== ZERO_TOKEN_ID) {
            const fromTokenInfo = await findTokenInfo(event.chainId, contractAddress, fromTokenId, transaction);
            if (fromTokenInfo) {
                await updateTokenInfoAndSendSQS(
                    fromTokenInfo,
                    { slot },
                    event.chainId,
                    contractAddress,
                    transaction
                );
            }
        }
    }
}

// 处理 Mint 操作
async function handleMint(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    to: string,
    timestamp: number,
    transaction: any
): Promise<void> {
    // 获取 slot
    const slot = await getSlotSafe(chainId, contractAddress, tokenId, 'Erc3525TokenInfoHandler:Mint');

    // 获取 tokenURI
    const tokenURI = await getTokenURISafe(chainId, contractAddress, tokenId, 'Erc3525TokenInfoHandler:Mint');

    // 从 RawOptContractInfo 中获取 productType（即合约的 contractType）
    const contractInfo = await RawOptContractInfo.findOne({
        where: {
            chainId,
            contractAddress: contractAddress.toLowerCase(),
        },
        transaction,
    });
    const productType = contractInfo?.contractType || '';

    // 使用 findOrCreate 避免唯一约束冲突
    const [tokenInfo, created] = await OptRawErc3525TokenInfo.findOrCreate({
        where: {
            chainId,
            contractAddress: contractAddress.toLowerCase(),
            tokenId,
        },
        defaults: {
            slot,
            balance: '0',
            holder: to.toLowerCase(),
            mintTime: timestamp,
            isBurned: 0,
            lastUpdated: timestamp,
            tokenURI: tokenURI || '',
            productType,
        },
        transaction,
    });

    // 如果记录已存在，更新相关信息（但不覆盖 mintTime）并发送 SQS
    if (!created) {
        await updateTokenInfoAndSendSQS(
            tokenInfo,
            {
                slot,
                holder: to.toLowerCase(),
                lastUpdated: timestamp,
                tokenURI: tokenURI || tokenInfo.tokenURI || '',
                isBurned: 0, // 如果是 mint 操作，确保 isBurned 为 0
            },
            chainId,
            contractAddress,
            transaction
        );
    } else {
        // 如果是新创建的记录，也需要发送 SQS
        try {
            await sendQueueMessage(chainId, 'assetQueue', {
                source: 'V3_5_Raw_Asset_Info',
                data: {
                    id: Number(tokenInfo.id),
                    chainId: String(chainId),
                    contractAddress: contractAddress,
                },
            });
        } catch (error) {
            console.error('Erc3525TokenInfoHandler: Failed to send SQS message for new token info', {
                id: tokenInfo.id,
                chainId,
                contractAddress,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

// 处理普通转账或 Burn 操作
async function handleTransferOrBurn(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    to: string,
    timestamp: number,
    transaction: any
): Promise<{ supplyDelta: string; isBurned: boolean }> {
    const tokenInfo = await findTokenInfo(chainId, contractAddress, tokenId, transaction);
    if (!tokenInfo) {
        console.warn(`Erc3525TokenInfoHandler: TokenInfo not found for tokenId ${tokenId} in Transfer event`);
        throw new Error(`TokenInfo not found for tokenId ${tokenId}`);
    }

    // 获取 tokenURI（如果需要更新）
    const tokenURI = await getTokenURISafe(chainId, contractAddress, tokenId, 'Erc3525TokenInfoHandler:Transfer');

    // 更新 holder 和 lastUpdated
    const updateData: any = {
        holder: to.toLowerCase(),
        lastUpdated: timestamp,
    };

    // 如果获取到了 tokenURI，也更新它
    if (tokenURI) {
        updateData.tokenURI = tokenURI;
    }

    // 如果 to 是 NULL_ADDRESS，标记为 burned
    const isBurned = to === NULL_ADDRESS;
    if (isBurned) {
        updateData.isBurned = 1;
    }

    // 更新 token 信息并发送 SQS
    await updateTokenInfoAndSendSQS(
        tokenInfo,
        updateData,
        chainId,
        contractAddress,
        transaction
    );

    return {
        supplyDelta: isBurned ? '1' : '0', // burn 时返回 '1' 表示需要减 1
        isBurned,
    };
}

// 处理 Transfer 事件
async function handleTransfer(
    event: any,
    args: Record<string, unknown>,
    contractInfo: RawOptContractInfo,
    transaction: any
): Promise<void> {
    const contractAddress = event.contractAddress.toLowerCase();
    const tokenId = String(args._tokenId ?? '');
    const from = String(args._from ?? '').toLowerCase();
    const to = String(args._to ?? '').toLowerCase();
    const timestamp = event.blockTimestamp;

    let totalSupply = contractInfo.totalSupply || '0';

    // 根据 from 地址判断操作类型
    if (from === NULL_ADDRESS) {
        // Mint 操作：增加 totalSupply
        totalSupply = addBigInt(totalSupply, '1');
        await handleMint(event.chainId, contractAddress, tokenId, to, timestamp, transaction);
    } else {
        // 普通转账或 Burn 操作
        try {
            const result = await handleTransferOrBurn(event.chainId, contractAddress, tokenId, to, timestamp, transaction);
            // 如果是 burn 操作，减少 totalSupply
            if (result.isBurned) {
                totalSupply = subBigInt(totalSupply, '1');
            }
        } catch (error) {
            // TokenInfo 不存在时直接返回
            return;
        }
    }

    // 更新合约信息并发送 SQS
    await updateContractInfoAndSendSQS(
        contractInfo,
        {
            totalSupply,
            lastUpdated: timestamp,
        },
        transaction
    );
}

export async function handleErc3525TokenInfoEvent(param: HandlerParam): Promise<void> {
    const { event, transaction, eventFunc, args } = param;

    console.log('Erc3525TokenInfoHandler: eventSignature', eventFunc);
    // 查询合约信息
    const contractInfo = await RawOptContractInfo.findOne({
        where: {
            chainId: event.chainId,
            contractAddress: event.contractAddress.toLowerCase(),
        },
        transaction,
    });

    if (!contractInfo) {
        console.warn(`Erc3525TokenInfoHandler: ContractInfo not found for ${event.contractAddress}`);
        return;
    }
    if (eventFunc === 'TransferValue(uint256,uint256,uint256)') {
        await handleTransferValue(event, args, transaction);
        // 更新合约信息并发送 SQS
        await updateContractInfoAndSendSQS(
            contractInfo,
            {
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );
    } else if (eventFunc === 'Transfer(address,address,uint256)') {
        await handleTransfer(event, args, contractInfo, transaction);
    }
}
