import type { HandlerParam } from '../../types/handler';
import type { Transaction } from 'sequelize';
import {RawOptRedeemSlotInfo} from "@solvprotocol/models";
import {CurrencyInfo} from "@solvprotocol/models";
import {RawOptErc3525TokenInfo} from "@solvprotocol/models";
import {RawOptPoolOrderInfo} from "@solvprotocol/models";
import {RawOptContractInfo} from "@solvprotocol/models";
import { getSlotOf, getSlotURI } from '../../lib/rpc';
import { AbiCoder } from 'ethers';
import { sendQueueMessageDelay } from '../../lib/sqs';

// ==================== 类型定义 ====================

interface SlotInfo {
    poolId?: unknown;
    currency?: unknown;
    nav?: unknown;
    createTime?: unknown;
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
        console.warn('RedeemSlotInfoHandler: BigInt addition failed', {
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
        console.warn('RedeemSlotInfoHandler: BigInt subtraction failed', {
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
		console.warn('RedeemSlotInfoHandler: Failed to get ContractInfo', {
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
 */
function decodeSlotInfoFromBytes(
	slotInfoBytes: string,
	contractType: string
): {
	poolId?: string;
	currencyAddress?: string;
	nav?: string;
	createTime?: number;
} {
	try {
		const abiCoder = AbiCoder.defaultAbiCoder();
		let decoded: unknown[];

		// 根据合约类型使用不同的 ABI 结构
		if (contractType === 'Open Fund Redemptions') {
			// bytes: (bytes32,address,uint256,uint256)
			// struct: poolId,currency,createTime,nav
			const types = ['bytes32', 'address', 'uint256', 'uint256'];
			decoded = abiCoder.decode(types, slotInfoBytes);
			const [poolIdBytes, currency, createTimeBigInt, navBigInt] = decoded;

			// bytes32 转换为字符串（hex 格式）
			let poolId: string | undefined;
			if (poolIdBytes) {
				const poolIdStr = String(poolIdBytes);
				// 如果是 hex 字符串，确保格式正确
				poolId = poolIdStr.startsWith('0x') ? poolIdStr.toLowerCase() : poolIdStr.toLowerCase();
			}

			// createTime 处理
			let createTime: number | undefined;
			if (createTimeBigInt !== null && createTimeBigInt !== undefined) {
				const createTimeStr = String(createTimeBigInt);
				// 如果 createTime 长度超过 10，截取前 10 位
				const timeStr = createTimeStr.length > 10 ? createTimeStr.slice(0, 10) : createTimeStr;
				createTime = toNumber(timeStr);
			}

			// nav 处理：即使为 0 也要提取
			let nav: string | undefined;
			if (navBigInt !== null && navBigInt !== undefined) {
				nav = String(navBigInt);
			}

			return {
				poolId,
				currencyAddress: currency ? toAddressString(currency) : undefined,
				nav,
				createTime,
			};
		} else {
			// 其他合约类型暂不支持
			return {};
		}
	} catch (error) {
		console.warn('RedeemSlotInfoHandler: Failed to decode slotInfo bytes', {
			contractType,
			slotInfoBytesPrefix: slotInfoBytes?.substring(0, 50),
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
	poolId?: string;
	currencyAddress?: string;
	nav?: string;
	createTime?: number;
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

	let createTime: number | undefined;
	const createTimeStr = toString(slotInfoObj.createTime);
	if (createTimeStr) {
		// 如果 createTime 长度超过 10，截取前 10 位
		const timeStr = createTimeStr.length > 10 ? createTimeStr.slice(0, 10) : createTimeStr;
		createTime = toNumber(timeStr);
	}

	return {
		poolId: toString(slotInfoObj.poolId)?.toLowerCase(),
		currencyAddress: toAddressString(slotInfoObj.currency),
		nav: toString(slotInfoObj.nav),
		createTime,
	};
}

/**
 * 从 slotURI（base64 编码的 JSON）中解析字段
 * 针对 RedeemSlotInfo 的字段：poolId, currency, nav, createTime
 */
function extractFieldsFromSlotURI(slotURI: string): {
	poolId?: string;
	currencyAddress?: string;
	nav?: string;
	createTime?: number;
} {
	try {
		// slotURI 格式: data:application/json;base64,{base64_encoded_json}
		if (!slotURI || !slotURI.startsWith('data:application/json;base64,')) {
			console.warn('RedeemSlotInfoHandler: slotURI format invalid', {
				hasSlotURI: !!slotURI,
				startsWith: slotURI?.substring(0, 30),
			});
			return {};
		}

		const base64Data = slotURI.replace('data:application/json;base64,', '');
		let jsonString: string;
		try {
			jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
		} catch (error) {
			console.warn('RedeemSlotInfoHandler: Failed to decode base64', {
				error: error instanceof Error ? error.message : String(error),
				base64DataPrefix: base64Data.substring(0, 50),
			});
			return {};
		}

		// 调试：记录解码后的 JSON 字符串（前 200 个字符）
		console.debug('RedeemSlotInfoHandler: Decoded JSON string', {
			jsonStringPrefix: jsonString.substring(0, 200),
			jsonStringLength: jsonString.length,
		});

		let parsed: any;
		try {
			parsed = JSON.parse(jsonString);
		} catch (error) {
			console.warn('RedeemSlotInfoHandler: Failed to parse JSON', {
				error: error instanceof Error ? error.message : String(error),
				jsonStringPrefix: jsonString.substring(0, 200),
				jsonStringLength: jsonString.length,
			});
			return {};
		}

		// 从 properties 数组中提取字段
		if (!parsed.properties || !Array.isArray(parsed.properties)) {
			console.warn('RedeemSlotInfoHandler: slotURI missing properties array', {
				hasProperties: !!parsed.properties,
				propertiesType: Array.isArray(parsed.properties) ? 'array' : typeof parsed.properties,
				parsedKeys: Object.keys(parsed),
			});
			return {};
		}

		const result: {
			poolId?: string;
			currencyAddress?: string;
			nav?: string;
			createTime?: number;
		} = {};

		for (const prop of parsed.properties) {
			if (prop.name === 'pool_id' && prop.value) {
				result.poolId = toString(prop.value)?.toLowerCase();
			} else if (prop.name === 'currency' && prop.value) {
				result.currencyAddress = toAddressString(prop.value);
			} else if (prop.name === 'nav' && prop.value !== undefined && prop.value !== null) {
				// nav 可能为 0，需要特殊处理
				result.nav = toString(prop.value);
			} else if (prop.name === 'create_time' && prop.value) {
				const createTimeStr = toString(prop.value);
				if (createTimeStr) {
					// 如果 createTime 长度超过 10，截取前 10 位
					const timeStr = createTimeStr.length > 10 ? createTimeStr.slice(0, 10) : createTimeStr;
					result.createTime = toNumber(timeStr);
				}
			}
		}

		// 调试：记录解析到的字段
		if (Object.keys(result).length > 0) {
			console.log('RedeemSlotInfoHandler: Extracted from slotURI', {
				extractedFields: Object.keys(result),
				propertiesCount: parsed.properties.length,
				propertyNames: parsed.properties.map((p: { name?: string }) => p.name),
			});
		}

		return result;
	} catch (error) {
		console.warn('RedeemSlotInfoHandler: Failed to parse slotURI', {
			error: error instanceof Error ? error.message : String(error),
			slotURIPrefix: slotURI?.substring(0, 50),
		});
		return {};
	}
}

/**
 * 获取 slotURI（安全调用，失败时返回空字符串）
 */
async function getSlotURISafe(
	chainId: number,
	contractAddress: string,
	slot: string,
    blockNumber?: number
): Promise<string> {
	try {
		return await getSlotURI(chainId, contractAddress, slot, blockNumber);
	} catch (error) {
		console.warn('RedeemSlotInfoHandler: Failed to get slotURI', {
			chainId,
			contractAddress,
			slot,
			error: error instanceof Error ? error.message : String(error),
		});
		return '';
	}
}

/**
 * 统一创建 RawOptRedeemSlotInfo 并发送 SQS
 */
async function createRedeemSlotInfoAndSendSQS(
	createData: Parameters<typeof RawOptRedeemSlotInfo.create>[0],
	chainId: number,
	transaction: Transaction
): Promise<RawOptRedeemSlotInfo> {
	const redeemSlotInfo = await RawOptRedeemSlotInfo.create(createData, { transaction });

	// 创建成功后发送 SQS 消息
	if (redeemSlotInfo && redeemSlotInfo.id) {
		try {
			await sendQueueMessageDelay(chainId, 'assetQueue', {
				source: 'V3_5_Raw_Redeem_Slot_Info',
				data: {
					id: Number(redeemSlotInfo.id),
					chainId: String(chainId),
					contractAddress: redeemSlotInfo.contractAddress,
				},
			});
		} catch (error) {
			console.error('RedeemSlotInfoHandler: Failed to send SQS message for new redeem slot info', {
				id: redeemSlotInfo.id,
				chainId,
				contractAddress: redeemSlotInfo.contractAddress,
				slot: redeemSlotInfo.slot,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return redeemSlotInfo;
}

/**
 * 统一更新 RawOptRedeemSlotInfo 并发送 SQS
 */
async function updateRedeemSlotInfoAndSendSQS(
	redeemSlotInfo: RawOptRedeemSlotInfo,
	updateData: Parameters<typeof RawOptRedeemSlotInfo.prototype.update>[0],
	transaction: Transaction
): Promise<void> {
	await redeemSlotInfo.update(updateData, { transaction });

	// 确保 chainId 存在才发送 SQS
	if (redeemSlotInfo.chainId !== undefined && redeemSlotInfo.chainId !== null) {
		try {
			await sendQueueMessageDelay(redeemSlotInfo.chainId, 'assetQueue', {
				source: 'V3_5_Raw_Redeem_Slot_Info',
				data: {
					id: Number(redeemSlotInfo.id),
					chainId: String(redeemSlotInfo.chainId),
					contractAddress: redeemSlotInfo.contractAddress,
				},
			});
		} catch (error) {
			console.error('RedeemSlotInfoHandler: Failed to send SQS message for updated redeem slot info', {
				id: redeemSlotInfo.id,
				chainId: redeemSlotInfo.chainId,
				contractAddress: redeemSlotInfo.contractAddress,
				slot: redeemSlotInfo.slot,
				error: error instanceof Error ? error.message : String(error),
			});
		}
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
		console.warn('RedeemSlotInfoHandler: Failed to get CurrencyInfo', {
			chainId,
			currencyAddress,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

// ==================== 数据访问层 ====================

/**
 * 根据 contractAddress 和 slot 查找 RedeemSlotInfo
 */
async function getRedeemSlotInfo(
    chainId: number,
    contractAddress: string,
    slot: string,
    transaction: Transaction
): Promise<RawOptRedeemSlotInfo | null> {
    try {
        return await RawOptRedeemSlotInfo.findOne({
            where: {
                chainId,
                contractAddress: contractAddress.toLowerCase(),
                slot,
            },
            transaction,
        });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: Failed to get RedeemSlotInfo', {
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
 * 优先从数据库查找，如果找不到，再从链上调用 slotOf
 */
async function getSlotFromTokenId(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    transaction: Transaction,
    blockNumber?: number
): Promise<string | null> {
    console.log('RedeemSlotInfoHandler: getSlotFromTokenId params', { chainId, contractAddress, tokenId });
    // 首先尝试从数据库查找
    try {
        const tokenInfo = await RawOptErc3525TokenInfo.findOne({
            where: {
                chainId,
                contractAddress: contractAddress.toLowerCase(),
                tokenId,
            },
            transaction,
        });

        if (tokenInfo?.slot) {
            return tokenInfo.slot;
        }
    } catch (error) {
        console.warn('RedeemSlotInfoHandler: Failed to get slot from database', {
            chainId,
            contractAddress,
            tokenId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    // 如果数据库中没有找到，尝试从链上获取
    const slotFromChain = await getSlotOf(chainId, contractAddress, tokenId, blockNumber);
    if (slotFromChain) {
        return slotFromChain;
    }

    // 如果都失败了，返回 null（不记录警告，由调用方决定如何处理）
    return null;
}

// ==================== 事件处理函数 ====================

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
        console.warn('RedeemSlotInfoHandler: CreateSlot missing slot', {
            eventId: event.eventId,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();

    // 检查是否已存在
    const existing = await getRedeemSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (existing) {
        console.log('RedeemSlotInfoHandler: CreateSlot record already exists', {
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
	let { poolId, currencyAddress, nav, createTime } = extractSlotInfoFields(slotInfo);

	// 如果从对象中提取失败，且 slotInfo 是字符串（可能是 hex bytes），尝试从 bytes 解码
	// 注意：nav 可能为 "0"，所以不能使用 !nav 来判断
	if ((!poolId || !currencyAddress || nav === undefined || nav === null || !createTime) && typeof slotInfo === 'string' && contractType) {
		// 检查是否是 hex 字符串（以 0x 开头）
		if (slotInfo.startsWith('0x')) {
			const bytesFields = decodeSlotInfoFromBytes(slotInfo, contractType);
			poolId = poolId || bytesFields.poolId;
			currencyAddress = currencyAddress || bytesFields.currencyAddress;
			// nav 可能为 "0"，需要特殊处理
			if (nav === undefined || nav === null) {
				nav = bytesFields.nav;
			}
			createTime = createTime || bytesFields.createTime;

			// if (bytesFields.poolId || bytesFields.currencyAddress || bytesFields.nav !== undefined || bytesFields.createTime) {
			// 	console.debug('RedeemSlotInfoHandler: Extracted fields from slotInfo bytes', {
			// 		eventId: event.eventId,
			// 		slot,
			// 		contractType,
			// 		extractedFields: {
			// 			poolId: !!bytesFields.poolId,
			// 			currencyAddress: !!bytesFields.currencyAddress,
			// 			nav: bytesFields.nav !== undefined,
			// 			createTime: !!bytesFields.createTime,
			// 		},
			// 	});
			// }
		}
	}

	// 注意：nav 可能为 "0"，所以不能使用 !nav 来判断
	if (!poolId || !currencyAddress || nav === undefined || nav === null || !createTime) {
		console.warn('RedeemSlotInfoHandler: CreateSlot missing required fields', {
			eventId: event.eventId,
			slot,
			hasPoolId: !!poolId,
			hasCurrencyAddress: !!currencyAddress,
			hasNav: nav !== undefined && nav !== null,
			hasCreateTime: !!createTime,
			slotInfoType: typeof slotInfo,
			slotInfoKeys: slotInfo && typeof slotInfo === 'object' ? Object.keys(slotInfo) : undefined,
		});
		return;
	}

	// 获取 currency symbol
	const currencySymbol = await getCurrencySymbol(event.chainId, currencyAddress, transaction);

    // 创建 RedeemSlotInfo 记录并发送 SQS
    try {
        await createRedeemSlotInfoAndSendSQS(
            {
                chainId: event.chainId,
                msgSender: creator || toAddressString(args.msgSender),
                contractAddress,
                slot,
                poolId,
                currencyAddress,
                currencySymbol,
                nav,
                startTime: createTime,
                txHash: event.transactionHash,
                handleStatus: '',
                state: 'Open',
                redeemAmount: '0',
                repaidValue: '0',
                claimedAmount: '0',
                lastUpdated: event.blockTimestamp,
                blockTimestamp: event.blockTimestamp,
            },
            event.chainId,
            transaction
        );

        // 使用 console.debug 避免在测试中输出日志
        // console.debug('RedeemSlotInfoHandler: CreateSlot success', {
        //     contractAddress,
        //     slot,
        //     poolId,
        //     eventId: event.eventId,
        // });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: CreateSlot failed', {
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
        console.warn('RedeemSlotInfoHandler: MintValue missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasValue: !!value,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();

    const redeemSlotInfo = await getRedeemSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!redeemSlotInfo) {
        console.warn('RedeemSlotInfoHandler: MintValue redeemSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentRedeemAmount = redeemSlotInfo.redeemAmount || '0';

    try {
        await updateRedeemSlotInfoAndSendSQS(
            redeemSlotInfo,
            {
                redeemAmount: addBigInt(currentRedeemAmount, value),
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('RedeemSlotInfoHandler: MintValue success', {
            contractAddress,
            slot,
            value,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: MintValue failed', {
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
 * 注意：签名是 Claim(address,uint256,uint256,address,uint256)
 */
async function handleClaim(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const tokenId = toString(extractArg(args, 'tokenId', '_tokenId'));
    const claimValue = toString(extractArg(args, 'claimValue', '_claimValue'));
    // currency 和 claimCurrencyAmount 在事件中，但旧代码中没有使用

    if (!tokenId || !claimValue) {
        console.warn('RedeemSlotInfoHandler: Claim missing required fields', {
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
        console.warn('RedeemSlotInfoHandler: Claim tokenInfo not found or missing slot', {
            contractAddress,
            tokenId,
            eventId: event.eventId,
        });
        return;
    }

    const redeemSlotInfo = await getRedeemSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!redeemSlotInfo) {
        console.warn('RedeemSlotInfoHandler: Claim redeemSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentClaimedAmount = redeemSlotInfo.claimedAmount || '0';

    try {
        await updateRedeemSlotInfoAndSendSQS(
            redeemSlotInfo,
            {
                claimedAmount: addBigInt(currentClaimedAmount, claimValue),
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('RedeemSlotInfoHandler: Claim success', {
            contractAddress,
            slot,
            claimValue,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: Claim failed', {
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
 * 注意：签名是 Repay(uint256,address,address,uint256)
 */
async function handleRepay(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const slot = toString(extractArg(args, 'slot', '_slot'));
    const repayCurrencyAmount = toString(extractArg(args, 'repayCurrencyAmount', '_repayCurrencyAmount'));
    // payer 和 currency 在事件中，但旧代码中没有使用

    if (!slot || !repayCurrencyAmount) {
        console.warn('RedeemSlotInfoHandler: Repay missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasRepayCurrencyAmount: !!repayCurrencyAmount,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();

    const redeemSlotInfo = await getRedeemSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!redeemSlotInfo) {
        console.warn('RedeemSlotInfoHandler: Repay redeemSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentRepaidValue = redeemSlotInfo.repaidValue || '0';

    try {
        await updateRedeemSlotInfoAndSendSQS(
            redeemSlotInfo,
            {
                repaidValue: addBigInt(currentRepaidValue, repayCurrencyAmount),
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('RedeemSlotInfoHandler: Repay success', {
            contractAddress,
            slot,
            repayCurrencyAmount,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: Repay failed', {
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
        console.warn('RedeemSlotInfoHandler: BurnValue missing required fields', {
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
        console.warn('RedeemSlotInfoHandler: BurnValue tokenInfo not found or missing slot', {
            contractAddress,
            tokenId,
            eventId: event.eventId,
        });
        return;
    }

    const redeemSlotInfo = await getRedeemSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!redeemSlotInfo) {
        console.warn('RedeemSlotInfoHandler: BurnValue redeemSlotInfo not found', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
        return;
    }

    const currentRedeemAmount = redeemSlotInfo.redeemAmount || '0';

    try {
        await updateRedeemSlotInfoAndSendSQS(
            redeemSlotInfo,
            {
                redeemAmount: subBigInt(currentRedeemAmount, burnValue),
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('RedeemSlotInfoHandler: BurnValue success', {
            contractAddress,
            slot,
            burnValue,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: BurnValue failed', {
            contractAddress,
            slot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * 根据 poolId 查找 PoolOrderInfo 并获取 openFundRedemption 地址
 */
async function getOpenFundRedemption(
    chainId: number,
    poolId: string,
    transaction: Transaction
): Promise<string | null> {
    try {
        const poolOrder = await RawOptPoolOrderInfo.findOne({
            where: {
                chainId,
                poolId: poolId.toLowerCase(),
            },
            transaction,
        });
        return poolOrder?.openFundRedemption?.toLowerCase() || null;
    } catch (error) {
        console.warn('RedeemSlotInfoHandler: Failed to get PoolOrderInfo', {
            chainId,
            poolId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

/**
 * 通过 poolId 和 slot 查找 RedeemSlotInfo
 * 这是一个便捷函数，封装了获取 openFundRedemption 和查找 RedeemSlotInfo 的流程
 */
async function getRedeemSlotInfoByPoolId(
    chainId: number,
    poolId: string,
    slot: string,
    transaction: Transaction,
    eventId: string
): Promise<RawOptRedeemSlotInfo | null> {
    // 获取 openFundRedemption 地址
    const openFundRedemption = await getOpenFundRedemption(chainId, poolId, transaction);
    if (!openFundRedemption) {
        console.warn('RedeemSlotInfoHandler: PoolOrder not found or missing openFundRedemption', {
            poolId,
            eventId,
        });
        return null;
    }

    // 查找 RedeemSlotInfo
    const redeemSlotInfo = await getRedeemSlotInfo(chainId, openFundRedemption, slot, transaction);
    if (!redeemSlotInfo) {
        console.warn('RedeemSlotInfoHandler: RedeemSlotInfo not found', {
            contractAddress: openFundRedemption,
            slot,
            poolId,
            eventId,
        });
        return null;
    }

    return redeemSlotInfo;
}

/**
 * 处理 SetRedeemNav 事件
 * 更新 RedeemSlotInfo 的 nav 和 navSetTime
 */
async function handleSetRedeemNav(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    // 提取并验证参数
    const poolId = toString(args.poolId)?.toLowerCase();
    const redeemSlot = toString(args.redeemSlot);
    const nav = toString(args.nav);

    if (!poolId || !redeemSlot || !nav) {
        console.warn('RedeemSlotInfoHandler: SetRedeemNav missing required fields', {
            eventId: event.eventId,
            hasPoolId: !!poolId,
            hasRedeemSlot: !!redeemSlot,
            hasNav: !!nav,
        });
        return;
    }

    // 查找 RedeemSlotInfo
    const redeemSlotInfo = await getRedeemSlotInfoByPoolId(
        event.chainId,
        poolId,
        redeemSlot,
        transaction,
        event.eventId
    );

    if (!redeemSlotInfo) {
        return;
    }

    // 更新记录并发送 SQS
    try {
        await updateRedeemSlotInfoAndSendSQS(
            redeemSlotInfo,
            {
                nav,
                navSetTime: event.blockTimestamp,
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('RedeemSlotInfoHandler: SetRedeemNav success', {
            poolId,
            slot: redeemSlot,
            nav,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: SetRedeemNav failed', {
            poolId,
            slot: redeemSlot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * 处理 CloseRedeemSlot 事件
 * 更新 RedeemSlotInfo 的 state 为 "Locked"
 */
async function handleCloseRedeemSlot(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    // 提取并验证参数
    const poolId = toString(args.poolId)?.toLowerCase();
    const previousRedeemSlot = toString(args.previousRedeemSlot);

    if (!poolId || !previousRedeemSlot) {
        console.warn('RedeemSlotInfoHandler: CloseRedeemSlot missing required fields', {
            eventId: event.eventId,
            hasPoolId: !!poolId,
            hasPreviousRedeemSlot: !!previousRedeemSlot,
        });
        return;
    }

    // 查找 RedeemSlotInfo
    const redeemSlotInfo = await getRedeemSlotInfoByPoolId(
        event.chainId,
        poolId,
        previousRedeemSlot,
        transaction,
        event.eventId
    );

    if (!redeemSlotInfo) {
        return;
    }

    // 更新记录并发送 SQS
    try {
        await updateRedeemSlotInfoAndSendSQS(
            redeemSlotInfo,
            {
                state: 'Locked',
                lastUpdated: event.blockTimestamp,
            },
            transaction
        );

        console.log('RedeemSlotInfoHandler: CloseRedeemSlot success', {
            poolId,
            slot: previousRedeemSlot,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('RedeemSlotInfoHandler: CloseRedeemSlot failed', {
            poolId,
            slot: previousRedeemSlot,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

// ==================== 事件签名常量 ====================

const REDEEM_SHARE_DELEGATE_EVENT_SIGNATURES = {
    CREATE_SLOT: 'CreateSlot(uint256,address,bytes)',
    MINT_VALUE: 'MintValue(uint256,uint256,uint256)',
    CLAIM: 'Claim(address,uint256,uint256,address,uint256)',
    REPAY: 'Repay(uint256,address,address,uint256)',
    SLOT_CHANGED: 'SlotChanged(uint256,uint256,uint256)',
    BURN_VALUE: 'BurnValue(uint256,uint256)',
} as const;

const OPEN_FUND_MARKET_EVENT_SIGNATURES = {
    SET_REDEEM_NAV: 'SetRedeemNav(bytes32,uint256,uint256)',
    CLOSE_REDEEM_SLOT: 'CloseRedeemSlot(bytes32,uint256,uint256)',
} as const;

// ==================== 主处理函数 ====================

export async function handleOpenFundMarketEvent(param: HandlerParam): Promise<void> {
	const { eventFunc, event, args, transaction } = param;
    
    try {
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case OPEN_FUND_MARKET_EVENT_SIGNATURES.SET_REDEEM_NAV:
                await handleSetRedeemNav(event, args, transaction);
                break;

            case OPEN_FUND_MARKET_EVENT_SIGNATURES.CLOSE_REDEEM_SLOT:
                await handleCloseRedeemSlot(event, args, transaction);
                break;

            default:
                console.warn('RedeemSlotInfoHandler: unhandled OpenFundMarket event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('RedeemSlotInfoHandler: handleOpenFundMarketEvent failed', {
            eventFunc,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function handleRedeemShareDelegateEvent(param: HandlerParam): Promise<void> {
	const { eventFunc, event, args, transaction } = param;

    try {
        const existing = await RawOptContractInfo.findOne({
            where: {
                chainId: event.chainId,
                contractAddress: event.contractAddress.toLowerCase(),
                contractType: "Open Fund Redemptions",
            },
            transaction,
        });
        if (!existing) {
            return;
        }
        // 根据事件签名路由到对应的处理函数
        switch (eventFunc) {
            case REDEEM_SHARE_DELEGATE_EVENT_SIGNATURES.CREATE_SLOT:
                await handleCreateSlot(event, args, transaction);
                break;

            case REDEEM_SHARE_DELEGATE_EVENT_SIGNATURES.MINT_VALUE:
                await handleMintValue(event, args, transaction);
                break;

            case REDEEM_SHARE_DELEGATE_EVENT_SIGNATURES.CLAIM:
                await handleClaim(event, args, transaction);
                break;

            case REDEEM_SHARE_DELEGATE_EVENT_SIGNATURES.REPAY:
                await handleRepay(event, args, transaction);
                break;

            case REDEEM_SHARE_DELEGATE_EVENT_SIGNATURES.BURN_VALUE:
                await handleBurnValue(event, args, transaction);
                break;

            default:
                console.warn('RedeemSlotInfoHandler: unhandled event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('RedeemSlotInfoHandler: handleRedeemShareDelegateEvent failed', {
            eventFunc,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
