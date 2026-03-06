import type { HandlerParam } from '../../types/handler';
import type { Transaction } from 'sequelize';
import {RawOptPoolSlotInfo} from "@solvprotocol/models";
import {CurrencyInfo} from "@solvprotocol/models";
import {RawOptErc3525TokenInfo} from "@solvprotocol/models";
import {RawOptPoolOrderInfo} from "@solvprotocol/models";
import { getSlotURI, getSlotOf, getOwnerOf } from '../../lib/rpc';
import {RawOptContractInfo} from "@solvprotocol/models";
import { AbiCoder } from 'ethers';
import { sendQueueMessageDelay } from '../../lib/sqs';

// ==================== 类型定义 ====================

interface SlotInfo {
    currency?: unknown;
    maturity?: unknown;
    valueDate?: unknown;
    interestRate?: unknown;
    [key: string]: unknown;
}

// ==================== 工具函数 ====================

/**
 * 安全转换为字符串（地址转小写）
 */
function toAddressString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return String(value).toLowerCase();
}

/**
 * 安全转换为字符串（非地址）
 */
function toString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return String(value);
}

/**
 * 安全转换为数字
 */
function toNumber(value: unknown): number | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	const num = Number(value);
	return isNaN(num) ? undefined : num;
}

/**
 * 大数加法运算
 */
function addBigInt(a: string | undefined | null, b: string | undefined | null): string {
	const aValue = a || '0';
	const bValue = b || '0';
	try {
		return (BigInt(aValue) + BigInt(bValue)).toString();
	} catch (error) {
		console.error('PoolSlotInfoHandler: BigInt addition failed', {
			a: aValue,
			b: bValue,
			error: error instanceof Error ? error.message : String(error),
		});
		return '0';
	}
}

/**
 * 大数减法运算
 */
function subBigInt(a: string | undefined | null, b: string | undefined | null): string {
	const aValue = a || '0';
	const bValue = b || '0';
	try {
		const result = BigInt(aValue) - BigInt(bValue);
		// 确保结果不为负数
		return result < 0 ? '0' : result.toString();
	} catch (error) {
		console.error('PoolSlotInfoHandler: BigInt subtraction failed', {
			a: aValue,
			b: bValue,
			error: error instanceof Error ? error.message : String(error),
		});
		return '0';
	}
}

/**
 * 从事件参数中提取值（支持多种命名方式）
 */
function extractArg(args: HandlerParam['args'], ...keys: string[]): unknown {
	for (const key of keys) {
		if (args[key] !== undefined) {
			return args[key];
		}
	}
	return undefined;
}

// ==================== 数据访问层 ====================

/**
 * 根据 contractAddress 和 slot 查找 PoolSlotInfo
 */
async function getPoolSlotInfo(
	chainId: number,
	contractAddress: string,
	slot: string,
	transaction: Transaction
): Promise<RawOptPoolSlotInfo | null> {
	try {
		return await RawOptPoolSlotInfo.findOne({
			where: {
				chainId,
				contractAddress: contractAddress.toLowerCase(),
				slot,
			},
			transaction,
		});
	} catch (error) {
		console.error('PoolSlotInfoHandler: Failed to get PoolSlotInfo', {
			chainId,
			contractAddress,
			slot,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 从 PoolOrderInfo 中查找关联的 poolId
 */
async function findPoolIdBySlot(
	chainId: number,
	contractAddress: string,
	slot: string,
	transaction: Transaction
): Promise<string | undefined> {
	try {
		const poolOrder = await RawOptPoolOrderInfo.findOne({
			where: {
				chainId,
				openFundShare: contractAddress.toLowerCase(),
				openFundShareSlot: slot,
			},
			transaction,
		});
		return poolOrder?.poolId;
	} catch (error) {
		console.error('PoolSlotInfoHandler: Failed to find PoolOrderInfo', {
			chainId,
			contractAddress,
			slot,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

/**
 * 获取或创建 PoolSlotInfo
 */
async function getOrCreatePoolSlotInfo(
	chainId: number,
	contractAddress: string,
	slot: string,
	transaction: Transaction
): Promise<RawOptPoolSlotInfo | null> {
	const existing = await getPoolSlotInfo(chainId, contractAddress, slot, transaction);
	if (existing) {
		return existing;
	}

	// 尝试从 PoolOrderInfo 中查找关联的 poolId
	const poolId = await findPoolIdBySlot(chainId, contractAddress, slot, transaction);

	// 创建新记录（大部分字段会在 CreateSlot 事件中填充）并发送 SQS
	try {
		return await createPoolSlotInfoAndSendSQS(
			{
				chainId,
				contractAddress: contractAddress.toLowerCase(),
				slot,
				poolId: poolId || '',
				totalAmount: '0',
				totalRepaidValue: '0',
				totalClaimedValue: '0',
				lastUpdated: Math.floor(Date.now() / 1000),
			},
			chainId,
			transaction
		);
	} catch (error) {
		console.error('PoolSlotInfoHandler: Failed to create PoolSlotInfo', {
			chainId,
			contractAddress,
			slot,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 从 tokenId 获取 slot
 * 优先从数据库检查 isBurned 状态，如果已被 burn，直接返回数据库中的 slot
 * 如果未被 burn 或数据库中不存在，再从链上调用 slotOf
 */
async function getSlotFromTokenId(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    transaction: Transaction
): Promise<string | null> {
    // 首先从数据库查找 token 信息，检查 isBurned 状态
    try {
        const tokenInfo = await RawOptErc3525TokenInfo.findOne({
            where: {
                chainId,
                contractAddress: contractAddress.toLowerCase(),
                tokenId,
            },
            transaction,
        });

        // 如果 token 已被标记为 burned，直接返回数据库中的 slot，避免无效的链上调用
        if (tokenInfo && tokenInfo.isBurned === 1) {
            if (tokenInfo.slot) {
                console.log('PoolSlotInfoHandler: Got slot from database for burned token', {
                    chainId,
                    contractAddress,
                    tokenId,
                    slot: tokenInfo.slot,
                });
                return tokenInfo.slot;
            }
            // 如果已被 burn 但没有 slot 信息，返回 null
            return null;
        }

        // 如果数据库中有记录且未被 burn，但 slot 为空，尝试从链上获取
        if (tokenInfo && !tokenInfo.slot) {
            const slotFromChain = await getSlotOf(chainId, contractAddress, tokenId);
            if (slotFromChain) {
                return slotFromChain;
            }
        }

        // 如果数据库中有记录且有 slot，直接返回
        if (tokenInfo?.slot) {
            return tokenInfo.slot;
        }
    } catch (error) {
        console.debug('PoolSlotInfoHandler: Failed to get token info from database', {
            chainId,
            contractAddress,
            tokenId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    // 如果数据库中没有记录或记录中没有 slot，尝试从链上获取
    try {
        const slotFromChain = await getSlotOf(chainId, contractAddress, tokenId);
        if (slotFromChain) {
            return slotFromChain;
        }
    } catch (error) {
        // getSlotOf 已经处理了 invalid token ID 错误，这里只记录其他错误
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('invalid token ID') && !errorMessage.includes('token ID')) {
            console.debug('PoolSlotInfoHandler: Failed to get slot from chain', {
                chainId,
                contractAddress,
                tokenId,
                error: errorMessage,
            });
        }
    }

    // 如果都失败了，返回 null（不记录警告，由调用方决定如何处理）
    return null;
}

/**
 * 获取 slotURI（安全调用，失败时返回空字符串）
 */
async function getSlotURISafe(
    chainId: number,
    contractAddress: string,
    slot: string
): Promise<string> {
    try {
        return await getSlotURI(chainId, contractAddress, slot);
    } catch (error) {
        console.debug('PoolSlotInfoHandler: Failed to get slotURI', {
            chainId,
            contractAddress,
            slot,
            error: error instanceof Error ? error.message : String(error),
        });
        return '';
    }
}

/**
 * 统一创建 RawOptPoolSlotInfo 并发送 SQS
 */
async function createPoolSlotInfoAndSendSQS(
    createData: Parameters<typeof RawOptPoolSlotInfo.create>[0],
    chainId: number,
    transaction: Transaction
): Promise<RawOptPoolSlotInfo> {
    const poolSlotInfo = await RawOptPoolSlotInfo.create(createData, { transaction });

    // 创建成功后发送 SQS 消息
    if (poolSlotInfo && poolSlotInfo.id) {
        try {
            await sendQueueMessageDelay(chainId, 'assetQueue', {
                source: 'V3_5_Raw_Pool_Slot_Info',
                data: {
                    id: Number(poolSlotInfo.id),
                    chainId: String(chainId),
                    contractAddress: poolSlotInfo.contractAddress,
                },
            });
        } catch (error) {
            console.error('PoolSlotInfoHandler: Failed to send SQS message for new pool slot info', {
                id: poolSlotInfo.id,
                chainId,
                contractAddress: poolSlotInfo.contractAddress,
                slot: poolSlotInfo.slot,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return poolSlotInfo;
}

/**
 * 统一更新 RawOptPoolSlotInfo 并发送 SQS
 */
async function updatePoolSlotInfoAndSendSQS(
    poolSlotInfo: RawOptPoolSlotInfo,
    updateData: Parameters<typeof RawOptPoolSlotInfo.prototype.update>[0],
    transaction: Transaction
): Promise<void> {
    await poolSlotInfo.update(updateData, { transaction });

    // 确保 chainId 存在才发送 SQS
    if (poolSlotInfo.chainId !== undefined && poolSlotInfo.chainId !== null) {
        try {
            await sendQueueMessageDelay(poolSlotInfo.chainId, 'assetQueue', {
                source: 'V3_5_Raw_Pool_Slot_Info',
                data: {
                    id: Number(poolSlotInfo.id),
                    chainId: String(poolSlotInfo.chainId),
                    contractAddress: poolSlotInfo.contractAddress,
                },
            });
        } catch (error) {
            console.error('PoolSlotInfoHandler: Failed to send SQS message for updated pool slot info', {
                id: poolSlotInfo.id,
                chainId: poolSlotInfo.chainId,
                contractAddress: poolSlotInfo.contractAddress,
                slot: poolSlotInfo.slot,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

/**
 * 更新 PoolSlotInfo 并刷新 slotURI
 */
async function updatePoolSlotInfoWithURI(
    poolSlotInfo: RawOptPoolSlotInfo,
    chainId: number,
    contractAddress: string,
    slot: string,
    updateData: Partial<RawOptPoolSlotInfo>,
    timestamp: number,
    transaction: Transaction
): Promise<void> {
    // 获取最新的 slotURI
    const slotURI = await getSlotURISafe(chainId, contractAddress, slot);

    // 使用统一方法更新并发送 SQS
    await updatePoolSlotInfoAndSendSQS(
        poolSlotInfo,
        {
            ...updateData,
            slotURI,
            lastUpdated: timestamp,
        },
        transaction
    );
}

/**
 * 获取合约类型
 */
async function getContractType(
	chainId: number,
	contractAddress: string,
	transaction: Transaction
): Promise<string | null> {
	try {
		const contractInfo = await RawOptContractInfo.findOne({
			where: {
				chainId,
				contractAddress: contractAddress.toLowerCase(),
			},
			transaction,
		});
		return contractInfo?.contractType || null;
	} catch (error) {
		console.error('PoolSlotInfoHandler: Failed to get ContractInfo', {
			chainId,
			contractAddress,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 从 ABI 编码的 bytes 中解码 slotInfo
 * 根据合约类型使用不同的 ABI 结构
 * 
 * 注意：如果 slotInfoBytes 包含 ABI 编码的长度前缀（前 32 字节），需要先移除
 */
function decodeSlotInfoFromBytes(
	slotInfoBytes: string,
	contractType: string
): {
	currencyAddress?: string;
	maturity?: number;
	valueDate?: number;
	interestRate?: number;
	supervisor?: string;
} {
	try {
		// 检查并移除 ABI 编码的长度前缀（如果存在）
		// Solidity bytes 类型的 ABI 编码格式：前 32 字节是长度（uint256），后续是实际数据
		let actualBytes = slotInfoBytes;
		
		// 如果 bytes 长度足够，检查前 32 字节是否是长度前缀
		// 需要至少 66 个字符（0x + 64 hex chars = 32 bytes）才能有前缀
		if (actualBytes.length > 66 && actualBytes.startsWith('0x')) {
			const lengthPrefix = actualBytes.substring(0, 66); // 前 32 字节（64 hex chars + 0x）
			
			try {
				const lengthValue = BigInt(lengthPrefix);
				
				// 计算总数据长度（字节数）
				const totalBytes = (actualBytes.length - 2) / 2; // 减去 0x
				// 计算剩余数据长度（字节数），减去 32 字节前缀
				const remainingBytes = totalBytes - 32;
				
				// 如果长度前缀的值合理（大于 0 且小于等于剩余数据长度），则移除前缀
				// 同时检查长度前缀的值不能太大（比如超过 100KB），避免误判
				if (lengthValue > 0n && lengthValue <= BigInt(remainingBytes) && lengthValue <= 100000n) {
					// 移除长度前缀，只保留实际数据
					actualBytes = '0x' + actualBytes.substring(66);
					console.log('PoolSlotInfoHandler: Removed ABI length prefix from slotInfo bytes', {
						originalLength: slotInfoBytes.length,
						lengthPrefix: lengthPrefix,
						lengthValue: lengthValue.toString(),
						remainingBytes,
						actualBytesLength: actualBytes.length,
					});
				}
			} catch (prefixError) {
				// 如果无法解析长度前缀，说明可能不是长度前缀，直接使用原始数据
				console.debug('PoolSlotInfoHandler: Could not parse length prefix, using original bytes', {
					prefixError: prefixError instanceof Error ? prefixError.message : String(prefixError),
				});
			}
		}

		const abiCoder = AbiCoder.defaultAbiCoder();
		let decoded: unknown[];

		// 根据合约类型使用不同的 ABI 结构
		if (contractType === 'Open Fund Shares') {
			// bytes: (address,address,uint256,uint8,int32,uint64,uint64,uint64,bool,string)
			// struct: currency,supervisor,issueQuota,interestType,interestRate,valueDate,maturity,createTime,transferable,externalURI
			const types = ['address', 'address', 'uint256', 'uint8', 'int32', 'uint64', 'uint64', 'uint64', 'bool', 'string'];
			decoded = abiCoder.decode(types, actualBytes);
			const [currency, supervisor, , , interestRateInt32, valueDateUint64, maturityUint64] = decoded;

			return {
				currencyAddress: currency ? toAddressString(currency) : undefined,
				supervisor: supervisor ? toAddressString(supervisor) : undefined,
				valueDate: valueDateUint64 ? Number(valueDateUint64) : undefined,
				maturity: maturityUint64 ? Number(maturityUint64) : undefined,
				interestRate: interestRateInt32 !== undefined ? Number(interestRateInt32) : undefined,
			};
		} else {
			// 其他合约类型暂不支持
			return {};
		}
	} catch (error) {
		console.error('PoolSlotInfoHandler: Failed to decode slotInfo bytes', {
			contractType,
			slotInfoBytesPrefix: slotInfoBytes?.substring(0, 50),
			slotInfoBytesLength: slotInfoBytes?.length,
			error: error instanceof Error ? error.message : String(error),
		});
		return {};
	}
}

/**
 * 从 slotInfo 对象中提取字段
 * slotInfo 可能是对象、字符串（JSON）或 bytes（hex 字符串）
 */
function extractSlotInfoFields(slotInfo: unknown): {
	currencyAddress?: string;
	maturity?: number;
	valueDate?: number;
	interestRate?: number;
} {
	if (!slotInfo) {
		return {};
	}

	// 如果 slotInfo 是字符串，尝试解析为 JSON
	let slotInfoObj: SlotInfo | undefined;
	if (typeof slotInfo === 'string') {
		try {
			// 尝试解析 JSON 字符串
			slotInfoObj = JSON.parse(slotInfo) as SlotInfo;
		} catch (error) {
			// 如果不是 JSON，可能是 hex 字符串，暂时跳过
			return {};
		}
	} else if (typeof slotInfo === 'object') {
		slotInfoObj = slotInfo as SlotInfo;
	} else {
		return {};
	}

	return {
		currencyAddress: toAddressString(slotInfoObj.currency),
		maturity: toNumber(slotInfoObj.maturity),
		valueDate: toNumber(slotInfoObj.valueDate),
		interestRate: toNumber(slotInfoObj.interestRate),
	};
}

/**
 * 从 slotURI（base64 编码的 JSON）中解析字段
 */
function extractFieldsFromSlotURI(slotURI: string): {
    currencyAddress?: string;
    maturity?: number;
    valueDate?: number;
    interestRate?: number;
    supervisor?: string;
    transferable?: boolean;
} {
    try {
        // slotURI 格式: data:application/json;base64,{base64_encoded_json}
        if (!slotURI || !slotURI.startsWith('data:application/json;base64,')) {
            return {};
        }

        const base64Data = slotURI.replace('data:application/json;base64,', '');
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const parsed = JSON.parse(jsonString);

        // 从 properties 数组中提取字段
        if (!parsed.properties || !Array.isArray(parsed.properties)) {
            return {};
        }

        const result: {
            currencyAddress?: string;
            maturity?: number;
            valueDate?: number;
            interestRate?: number;
            supervisor?: string;
            transferable?: boolean;
        } = {};

        for (const prop of parsed.properties) {
            if (prop.name === 'currency' && prop.value) {
                result.currencyAddress = toAddressString(prop.value);
            } else if (prop.name === 'maturity' && prop.value) {
                result.maturity = toNumber(prop.value);
            } else if (prop.name === 'value_date' && prop.value) {
                result.valueDate = toNumber(prop.value);
            } else if (prop.name === 'interest_rate' && prop.value !== undefined) {
                result.interestRate = toNumber(prop.value);
            } else if (prop.name === 'supervisor' && prop.value) {
                result.supervisor = toAddressString(prop.value);
            } else if (prop.name === 'transferable' && prop.value !== undefined) {
                result.transferable = Boolean(prop.value);
            }
        }

        return result;
    } catch (error) {
        console.error('PoolSlotInfoHandler: Failed to parse slotURI', {
            error: error instanceof Error ? error.message : String(error),
        });
        return {};
    }
}

/**
 * 获取货币符号
 */
async function getCurrencySymbol(
    chainId: number,
    currencyAddress: string,
    transaction: Transaction
): Promise<string | undefined> {
    try {
        const currencyInfo = await CurrencyInfo.findOne({
            where: {
                chainId,
                currencyAddress: currencyAddress.toLowerCase(),
            },
            transaction,
        });
        return currencyInfo?.symbol;
    } catch (error) {
        console.error('PoolSlotInfoHandler: Failed to get CurrencyInfo', {
            chainId,
            currencyAddress,
            error: error instanceof Error ? error.message : String(error),
        });
        return undefined;
    }
}

/**
 * 处理 CreateSlot 事件
 */
async function handleCreateSlot(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const slot = toString(extractArg(args, '_slot', 'slot'));
    if (!slot) {
        console.warn('PoolSlotInfoHandler: CreateSlot missing slot', {
            eventId: event.eventId,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();

    // 检查是否已存在
    const existing = await getPoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (existing) {
        console.log('PoolSlotInfoHandler: CreateSlot record already exists', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

	// 提取参数
	const creator = toAddressString(extractArg(args, '_creator', 'creator'));
	const slotInfo = extractArg(args, '_slotInfo', 'slotInfo');

	// 获取合约类型
	const contractType = await getContractType(event.chainId, contractAddress, transaction);

	// 从 slotInfo 中提取字段
	let { currencyAddress, maturity, valueDate, interestRate } = extractSlotInfoFields(slotInfo);

	// 如果从对象中提取失败，且 slotInfo 是字符串（可能是 hex bytes），尝试从 bytes 解码
	if ((!currencyAddress || !maturity || !valueDate) && typeof slotInfo === 'string' && contractType) {
		// 检查是否是 hex 字符串（以 0x 开头）
		if (slotInfo.startsWith('0x')) {
			const bytesFields = decodeSlotInfoFromBytes(slotInfo, contractType);
			currencyAddress = currencyAddress || bytesFields.currencyAddress;
			maturity = maturity || bytesFields.maturity;
			valueDate = valueDate || bytesFields.valueDate;
			interestRate = interestRate !== undefined ? interestRate : bytesFields.interestRate;

			if (bytesFields.currencyAddress || bytesFields.maturity || bytesFields.valueDate) {
				console.log('PoolSlotInfoHandler: Extracted fields from slotInfo bytes', {
					eventId: event.eventId,
					slot,
					contractType,
					extractedFields: {
						currencyAddress: !!bytesFields.currencyAddress,
						maturity: !!bytesFields.maturity,
						valueDate: !!bytesFields.valueDate,
						interestRate: !!bytesFields.interestRate,
					},
				});
			}
		}
	}

	// 获取 slotURI
	const slotURI = await getSlotURISafe(event.chainId, contractAddress, slot);

	// 如果从 slotInfo 中提取失败或字段不完整，尝试从 slotURI 中解析
	let supervisor: string | undefined;
	let transferable: boolean | undefined;
	if (slotURI) {
		const uriFields = extractFieldsFromSlotURI(slotURI);
		// 优先使用 slotInfo 中的值，如果为空则使用 slotURI 中的值
		currencyAddress = currencyAddress || uriFields.currencyAddress;
		maturity = maturity || uriFields.maturity;
		valueDate = valueDate || uriFields.valueDate;
		interestRate = interestRate !== undefined ? interestRate : uriFields.interestRate;
		supervisor = supervisor || uriFields.supervisor;
		transferable = transferable !== undefined ? transferable : uriFields.transferable;
	}

    // 获取关联的 poolId
    const poolId = await findPoolIdBySlot(event.chainId, contractAddress, slot, transaction);

    // 获取 currency symbol
    const currencySymbol = currencyAddress
        ? await getCurrencySymbol(event.chainId, currencyAddress, transaction)
        : undefined;

    // 创建 PoolSlotInfo 记录并发送 SQS
    try {
        await createPoolSlotInfoAndSendSQS(
            {
                chainId: event.chainId,
                msgSender: creator || toAddressString(args.msgSender),
                contractAddress,
                slot,
                poolId: poolId || '',
                currencyAddress: currencyAddress || '',
                currencySymbol,
                maturity,
                valueDate,
                interestRate,
                supervisor: supervisor || '',
                transferable,
                txHash: event.transactionHash,
                slotURI,
                handleStatus: '',
                totalAmount: '0',
                totalRepaidValue: '0',
                totalClaimedValue: '0',
                lastUpdated: event.blockTimestamp,
            },
            event.chainId,
            transaction
        );

        console.log('PoolSlotInfoHandler: CreateSlot success', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSlotInfoHandler: CreateSlot failed', {
            contractAddress,
            slot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * 处理 MintValue 事件
 */
async function handleMintValue(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const slot = toString(extractArg(args, '_slot', 'slot'));
    const value = toString(extractArg(args, '_value', 'value'));

    if (!slot || !value) {
        console.warn('PoolSlotInfoHandler: MintValue missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasValue: !!value,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();
    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSlotInfoHandler: MintValue poolSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentTotalValue = poolSlotInfo.totalAmount || '0';

    try {
        await updatePoolSlotInfoWithURI(
            poolSlotInfo,
            event.chainId,
            contractAddress,
            slot,
            {
                totalAmount: addBigInt(currentTotalValue, value),
            },
            event.blockTimestamp,
            transaction
        );

        console.log('PoolSlotInfoHandler: MintValue success', {
            contractAddress,
            slot,
            value,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSlotInfoHandler: MintValue failed', {
            contractAddress,
            slot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * 处理 Claim 事件
 */
async function handleClaim(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const tokenId = toString(args.tokenId);
    const claimValue = toString(args.claimValue);

    if (!tokenId || !claimValue) {
        console.warn('PoolSlotInfoHandler: Claim missing required fields', {
            eventId: event.eventId,
            hasTokenId: !!tokenId,
            hasClaimValue: !!claimValue,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();

    // 从 tokenId 获取 slot
    const slot = await getSlotFromTokenId(event.chainId, contractAddress, tokenId, transaction);
    if (!slot) {
        console.warn('PoolSlotInfoHandler: Claim tokenInfo not found or missing slot', {
            contractAddress,
            tokenId,
            eventId: event.eventId,
        });
        return;
    }

    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSlotInfoHandler: Claim poolSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentClaimedValue = poolSlotInfo.totalClaimedValue || '0';

    try {
        await updatePoolSlotInfoWithURI(
            poolSlotInfo,
            event.chainId,
            contractAddress,
            slot,
            {
                totalClaimedValue: addBigInt(currentClaimedValue, claimValue),
            },
            event.blockTimestamp,
            transaction
        );

        console.log('PoolSlotInfoHandler: Claim success', {
            contractAddress,
            slot,
            claimValue,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSlotInfoHandler: Claim failed', {
            contractAddress,
            slot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * 处理 Repay 事件
 */
async function handleRepay(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const slot = toString(args.slot);
    const repayCurrencyAmount = toString(args.repayCurrencyAmount);

    if (!slot || !repayCurrencyAmount) {
        console.warn('PoolSlotInfoHandler: Repay missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasRepayCurrencyAmount: !!repayCurrencyAmount,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();
    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSlotInfoHandler: Repay poolSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentRepaidValue = poolSlotInfo.totalRepaidValue || '0';

    try {
        await updatePoolSlotInfoWithURI(
            poolSlotInfo,
            event.chainId,
            contractAddress,
            slot,
            {
                totalRepaidValue: addBigInt(currentRepaidValue, repayCurrencyAmount),
            },
            event.blockTimestamp,
            transaction
        );

        console.log('PoolSlotInfoHandler: Repay success', {
            contractAddress,
            slot,
            repayCurrencyAmount,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSlotInfoHandler: Repay failed', {
            contractAddress,
            slot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * 处理 SetInterestRate 事件
 */
async function handleSetInterestRate(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const slot = toString(args.slot);
    const interestRate = toNumber(args.interestRate);

    if (!slot || interestRate === undefined) {
        console.warn('PoolSlotInfoHandler: SetInterestRate missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasInterestRate: interestRate !== undefined,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();
    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSlotInfoHandler: SetInterestRate poolSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    try {
        await updatePoolSlotInfoWithURI(
            poolSlotInfo,
            event.chainId,
            contractAddress,
            slot,
            {
                interestRate,
            },
            event.blockTimestamp,
            transaction
        );

        console.log('PoolSlotInfoHandler: SetInterestRate success', {
            contractAddress,
            slot,
            interestRate,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSlotInfoHandler: SetInterestRate failed', {
            contractAddress,
            slot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * 处理 BurnValue 事件
 */
async function handleBurnValue(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const tokenId = toString(args.tokenId);
    const burnValue = toString(args.burnValue);

    if (!tokenId || !burnValue) {
        console.warn('PoolSlotInfoHandler: BurnValue missing required fields', {
            eventId: event.eventId,
            hasTokenId: !!tokenId,
            hasBurnValue: !!burnValue,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();

    // 从 tokenId 获取 slot
    const slot = await getSlotFromTokenId(event.chainId, contractAddress, tokenId, transaction);
    if (!slot) {
        console.warn('PoolSlotInfoHandler: BurnValue tokenInfo not found or missing slot', {
            contractAddress,
            tokenId,
            eventId: event.eventId,
        });
        return;
    }

    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSlotInfoHandler: BurnValue poolSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentTotalValue = poolSlotInfo.totalAmount || '0';

    try {
        await updatePoolSlotInfoWithURI(
            poolSlotInfo,
            event.chainId,
            contractAddress,
            slot,
            {
                totalAmount: subBigInt(currentTotalValue, burnValue),
            },
            event.blockTimestamp,
            transaction
        );

        console.log('PoolSlotInfoHandler: BurnValue success', {
            contractAddress,
            slot,
            burnValue,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSlotInfoHandler: BurnValue failed', {
            contractAddress,
            slot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// 事件签名常量
const OPEN_SHARE_DELEGATE_EVENT_SIGNATURES = {
    CREATE_SLOT: 'CreateSlot(uint256,address,bytes)',
    MINT_VALUE: 'MintValue(uint256,uint256,uint256)',
    CLAIM: 'Claim(address,uint256,uint256)',
    REPAY: 'Repay(uint256,address,uint256)',
    SET_INTEREST_RATE: 'SetInterestRate(uint256,int32)',
    BURN_VALUE: 'BurnValue(uint256,uint256)',
} as const;

const OPEN_FUND_MARKET_EVENT_SIGNATURES = {
    CREATE_POOL: 'CreatePool(bytes32,address,address,((address,address,uint256,uint256),(uint16,address,uint64),(address,address,address),(uint256,uint256,uint256,uint64,uint64),address,address,address,uint64,bool,uint256))',
} as const;

/**
 * 处理 CreatePool 事件
 * 更新 PoolSlotInfo 的 poolId 和 lastUpdated 字段
 */
async function handleCreatePool(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const poolId = toString(extractArg(args, 'poolId', '_poolId'))?.toLowerCase();
    if (!poolId) {
        console.warn('PoolSlotInfoHandler: CreatePool missing poolId', {
            eventId: event.eventId,
        });
        return;
    }

    // 从 poolInfo_ 中提取 poolSFTInfo
    const poolInfo = args.poolInfo_ as {
        poolSFTInfo?: {
            openFundShare?: unknown;
            openFundShareSlot?: unknown;
        };
    } | undefined;

    if (!poolInfo?.poolSFTInfo) {
        console.warn('PoolSlotInfoHandler: CreatePool missing poolSFTInfo', {
            eventId: event.eventId,
            poolId,
        });
        return;
    }

    const openFundShare = toAddressString(poolInfo.poolSFTInfo.openFundShare);
    const openFundShareSlot = toString(poolInfo.poolSFTInfo.openFundShareSlot);

    if (!openFundShare || !openFundShareSlot) {
        console.warn('PoolSlotInfoHandler: CreatePool missing openFundShare or openFundShareSlot', {
            eventId: event.eventId,
            poolId,
            hasOpenFundShare: !!openFundShare,
            hasOpenFundShareSlot: !!openFundShareSlot,
        });
        return;
    }

    // 查找或创建 PoolSlotInfo（如果不存在则创建，确保 poolId 能够被更新）
    let poolSlotInfo = await getPoolSlotInfo(event.chainId, openFundShare, openFundShareSlot, transaction);
    if (!poolSlotInfo) {
        // 如果 PoolSlotInfo 不存在，创建一个基本记录
        console.log('PoolSlotInfoHandler: CreatePool poolSlotInfo not found, creating new record', {
            contractAddress: openFundShare,
            slot: openFundShareSlot,
            poolId,
            eventId: event.eventId,
        });
        poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, openFundShare, openFundShareSlot, transaction);
        if (!poolSlotInfo) {
            console.error('PoolSlotInfoHandler: CreatePool failed to create poolSlotInfo', {
                contractAddress: openFundShare,
                slot: openFundShareSlot,
                poolId,
                eventId: event.eventId,
            });
            return;
        }
    }

    try {
        await updatePoolSlotInfoAndSendSQS(
            poolSlotInfo,
            {
                poolId,
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('PoolSlotInfoHandler: CreatePool success', {
            contractAddress: openFundShare,
            slot: openFundShareSlot,
            poolId,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSlotInfoHandler: CreatePool failed', {
            contractAddress: openFundShare,
            slot: openFundShareSlot,
            poolId,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
    const { eventFunc, event, args, transaction } = param;

    try {
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case OPEN_FUND_MARKET_EVENT_SIGNATURES.CREATE_POOL:
                await handleCreatePool(event, args, transaction);
                break;

            default:
                console.warn('PoolSlotInfoHandler: unhandled OpenFundMarket event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('PoolSlotInfoHandler: handleOpenFundMarketEvent failed', {
            eventFunc,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function handleOpenShareDelegateEvent(param: HandlerParam): Promise<void> {
    const { eventFunc, event, args, transaction } = param;

    try {
        const existing = await RawOptContractInfo.findOne({
            where: {
                chainId: event.chainId,
                contractAddress: event.contractAddress.toLowerCase(),
                contractType: "Open Fund Shares",
            },
            transaction,
        });
        if (!existing) {
            return;
        }
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case OPEN_SHARE_DELEGATE_EVENT_SIGNATURES.CREATE_SLOT:
                await handleCreateSlot(event, args, transaction);
                break;

            case OPEN_SHARE_DELEGATE_EVENT_SIGNATURES.MINT_VALUE:
                await handleMintValue(event, args, transaction);
                break;

            case OPEN_SHARE_DELEGATE_EVENT_SIGNATURES.CLAIM:
                await handleClaim(event, args, transaction);
                break;

            case OPEN_SHARE_DELEGATE_EVENT_SIGNATURES.REPAY:
                await handleRepay(event, args, transaction);
                break;

            case OPEN_SHARE_DELEGATE_EVENT_SIGNATURES.SET_INTEREST_RATE:
                await handleSetInterestRate(event, args, transaction);
                break;

            case OPEN_SHARE_DELEGATE_EVENT_SIGNATURES.BURN_VALUE:
                await handleBurnValue(event, args, transaction);
                break;

            default:
                console.warn('PoolSlotInfoHandler: unhandled event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('PoolSlotInfoHandler: handleOpenShareDelegateEvent failed', {
            eventFunc,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}