import type { HandlerParam } from '../../types/handler';
import type { Transaction } from 'sequelize';
import RawOptPoolSlotInfo from '../../models/RawOptPoolSlotInfo';
import CurrencyInfo from '../../models/CurrencyInfo';
import OptRawErc3525TokenInfo from '../../models/RawOptErc3525TokenInfo';
import RawOptPoolOrderInfo from '../../models/RawOptPoolOrderInfo';
import { getSlotURI, getSlotOf, getOwnerOf } from '../../lib/rpc';
import RawOptContractInfo from '../../models/RawOptContractInfo';
import { AbiCoder } from 'ethers';

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
		console.warn('PoolSoltInfoHandler: BigInt addition failed', {
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
		console.warn('PoolSoltInfoHandler: BigInt subtraction failed', {
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
		console.error('PoolSoltInfoHandler: Failed to get PoolSlotInfo', {
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
		console.warn('PoolSoltInfoHandler: Failed to find PoolOrderInfo', {
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

	// 创建新记录（大部分字段会在 CreateSlot 事件中填充）
	try {
		return await RawOptPoolSlotInfo.create(
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
			{ transaction }
		);
	} catch (error) {
		console.error('PoolSoltInfoHandler: Failed to create PoolSlotInfo', {
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
 * 优先从链上调用 slotOf，如果失败（token 已被 burn 等），则从数据库查找历史记录
 */
async function getSlotFromTokenId(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    transaction: Transaction
): Promise<string | null> {
    // 首先尝试从链上获取
    const slotFromChain = await getSlotOf(chainId, contractAddress, tokenId);
    if (slotFromChain) {
        return slotFromChain;
    }

    // 如果链上获取失败（token 可能已被 burn），尝试从数据库查找历史记录
    try {
        const tokenInfo = await OptRawErc3525TokenInfo.findOne({
            where: {
                chainId,
                contractAddress: contractAddress.toLowerCase(),
                tokenId,
            },
            transaction,
        });

        if (tokenInfo?.slot) {
            console.log('PoolSoltInfoHandler: Got slot from database for burned token', {
                chainId,
                contractAddress,
                tokenId,
                slot: tokenInfo.slot,
            });
            return tokenInfo.slot;
        }
    } catch (error) {
        console.warn('PoolSoltInfoHandler: Failed to get slot from database', {
            chainId,
            contractAddress,
            tokenId,
            error: error instanceof Error ? error.message : String(error),
        });
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
        console.warn('PoolSoltInfoHandler: Failed to get slotURI', {
            chainId,
            contractAddress,
            slot,
            error: error instanceof Error ? error.message : String(error),
        });
        return '';
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

    await poolSlotInfo.update(
        {
            ...updateData,
            slotURI,
            lastUpdated: timestamp,
        },
        { transaction }
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
		console.warn('PoolSoltInfoHandler: Failed to get ContractInfo', {
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
	currencyAddress?: string;
	maturity?: number;
	valueDate?: number;
	interestRate?: number;
	supervisor?: string;
} {
	try {
		const abiCoder = AbiCoder.defaultAbiCoder();
		let decoded: unknown[];

		// 根据合约类型使用不同的 ABI 结构
		if (contractType === 'Open Fund Shares') {
			// bytes: (address,address,uint256,uint8,int32,uint64,uint64,uint64,bool,string)
			// struct: currency,supervisor,issueQuota,interestType,interestRate,valueDate,maturity,createTime,transferable,externalURI
			const types = ['address', 'address', 'uint256', 'uint8', 'int32', 'uint64', 'uint64', 'uint64', 'bool', 'string'];
			decoded = abiCoder.decode(types, slotInfoBytes);
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
		console.warn('PoolSoltInfoHandler: Failed to decode slotInfo bytes', {
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
        console.warn('PoolSoltInfoHandler: Failed to parse slotURI', {
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
        console.warn('PoolSoltInfoHandler: Failed to get CurrencyInfo', {
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
        console.warn('PoolSoltInfoHandler: CreateSlot missing slot', {
            eventId: event.eventId,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();

    // 检查是否已存在
    const existing = await getPoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (existing) {
        console.log('PoolSoltInfoHandler: CreateSlot record already exists', {
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
				console.log('PoolSoltInfoHandler: Extracted fields from slotInfo bytes', {
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

    // 创建 PoolSlotInfo 记录
    try {
        await RawOptPoolSlotInfo.create(
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
            { transaction }
        );

        console.log('PoolSoltInfoHandler: CreateSlot success', {
            contractAddress,
            slot,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSoltInfoHandler: CreateSlot failed', {
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
        console.warn('PoolSoltInfoHandler: MintValue missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasValue: !!value,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();
    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSoltInfoHandler: MintValue poolSlotInfo not found', {
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

        console.log('PoolSoltInfoHandler: MintValue success', {
            contractAddress,
            slot,
            value,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSoltInfoHandler: MintValue failed', {
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
        console.warn('PoolSoltInfoHandler: Claim missing required fields', {
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
        console.warn('PoolSoltInfoHandler: Claim tokenInfo not found or missing slot', {
            contractAddress,
            tokenId,
            eventId: event.eventId,
        });
        return;
    }

    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSoltInfoHandler: Claim poolSlotInfo not found', {
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

        console.log('PoolSoltInfoHandler: Claim success', {
            contractAddress,
            slot,
            claimValue,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSoltInfoHandler: Claim failed', {
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
        console.warn('PoolSoltInfoHandler: Repay missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasRepayCurrencyAmount: !!repayCurrencyAmount,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();
    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSoltInfoHandler: Repay poolSlotInfo not found', {
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

        console.log('PoolSoltInfoHandler: Repay success', {
            contractAddress,
            slot,
            repayCurrencyAmount,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSoltInfoHandler: Repay failed', {
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
        console.warn('PoolSoltInfoHandler: SetInterestRate missing required fields', {
            eventId: event.eventId,
            hasSlot: !!slot,
            hasInterestRate: interestRate !== undefined,
        });
        return;
    }

    const contractAddress = event.contractAddress.toLowerCase();
    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSoltInfoHandler: SetInterestRate poolSlotInfo not found', {
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

        console.log('PoolSoltInfoHandler: SetInterestRate success', {
            contractAddress,
            slot,
            interestRate,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSoltInfoHandler: SetInterestRate failed', {
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
        console.warn('PoolSoltInfoHandler: BurnValue missing required fields', {
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
        console.warn('PoolSoltInfoHandler: BurnValue tokenInfo not found or missing slot', {
            contractAddress,
            tokenId,
            eventId: event.eventId,
        });
        return;
    }

    const poolSlotInfo = await getOrCreatePoolSlotInfo(event.chainId, contractAddress, slot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSoltInfoHandler: BurnValue poolSlotInfo not found', {
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

        console.log('PoolSoltInfoHandler: BurnValue success', {
            contractAddress,
            slot,
            burnValue,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSoltInfoHandler: BurnValue failed', {
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
    CREATE_POOL_SLOT: 'CreatePoolSlot(bytes32,address,uint256,uint256)',
} as const;

/**
 * 处理 CreatePoolSlot 事件
 * 更新 PoolSlotInfo 的 poolId 字段
 */
async function handleCreatePoolSlot(
    event: HandlerParam['event'],
    args: HandlerParam['args'],
    transaction: Transaction
): Promise<void> {
    const poolId = toString(args.poolId)?.toLowerCase();
    const openFundShare = toAddressString(args.openFundShare || args.sft);
    const openFundShareSlot = toString(args.openFundShareSlot || args.slot);

    if (!poolId || !openFundShare || !openFundShareSlot) {
        console.warn('PoolSoltInfoHandler: CreatePoolSlot missing required fields', {
            eventId: event.eventId,
            hasPoolId: !!poolId,
            hasOpenFundShare: !!openFundShare,
            hasOpenFundShareSlot: !!openFundShareSlot,
        });
        return;
    }

    // 查找 PoolSlotInfo
    const poolSlotInfo = await getPoolSlotInfo(event.chainId, openFundShare, openFundShareSlot, transaction);
    if (!poolSlotInfo) {
        console.warn('PoolSoltInfoHandler: CreatePoolSlot poolSlotInfo not found', {
            contractAddress: openFundShare,
            slot: openFundShareSlot,
            poolId,
            eventId: event.eventId,
        });
        return;
    }

    try {
        await poolSlotInfo.update(
            {
                poolId,
                lastUpdated: event.blockTimestamp,
            },
            { transaction }
        );

        console.log('PoolSoltInfoHandler: CreatePoolSlot success', {
            contractAddress: openFundShare,
            slot: openFundShareSlot,
            poolId,
            eventId: event.eventId,
        });
    } catch (error) {
        console.error('PoolSoltInfoHandler: CreatePoolSlot failed', {
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
            case OPEN_FUND_MARKET_EVENT_SIGNATURES.CREATE_POOL_SLOT:
                await handleCreatePoolSlot(event, args, transaction);
                break;

            default:
                console.warn('PoolSoltInfoHandler: unhandled OpenFundMarket event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('PoolSoltInfoHandler: handleOpenFundMarketEvent failed', {
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
                console.warn('PoolSoltInfoHandler: unhandled event signature', {
                    eventFunc,
                    eventId: event.eventId,
                });
        }
    } catch (error) {
        console.error('PoolSoltInfoHandler: handleOpenShareDelegateEvent failed', {
            eventFunc,
            eventId: event.eventId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}