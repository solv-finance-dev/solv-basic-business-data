# 基础事件监听架构说明 / EVM Monitor Architecture

## 目标与范围 / Goals & Scope
- 仅覆盖：配置结构、EVM 同步、handler 规则与 monitor 路由。Only covers config layout, EVM sync, handler rules, and monitor routing.

## 配置结构 / Configuration
### EVM 同步配置 / EVM Sync Config
- 文件：`config/evm.json`
- 示例：
```
{
	"chains": [
		{
			"chainId": 56,
			"startBlockNumber": 35123450,
			"blockLimit": 5
		}
	]
}
```
- 说明：`chainId` 指定链，`startBlockNumber` 为首次同步起点，`blockLimit` 为每次拉取区块范围大小。

### Handler 配置 / Handler Config
- 文件：`config/handlers.json`
- 结构：最外层为数组，每个元素为 handler 组，包含 `name`、`module` 与 `handlers`。
- `handlers` 内部对象字段：`handler`、`chainIds`、`contractAddresses`、`eventSignatures`。
- 示例：
```
[
	{
		"name": "测试 Handler",
		"module": "sampleHandler",
		"handlers": [
			{
				"handler": "handleEvent",
				"chainIds": [56],
				"contractAddresses": ["0x0000000000000000000000000000000000000000"],
				"eventSignatures": ["Transfer(address,address,uint256)"]
			}
		]
	}
]
```
- 规则：
  - `chainIds = null` 表示监听所有链；数组内可包含 `0` 表示监听链 0；空数组表示匹配不到任何链。
  - `contractAddresses = null` 表示监听所有合约；`[]` 表示匹配空合约列表（不会命中）。
  - `eventSignatures = null` 表示监听所有事件；空数组表示匹配不到任何事件；数组内空字符串表示监听空签名。
  - `eventSignatures` 支持 ABI 字符串或 0x 哈希；内部会将 ABI 字符串转换为哈希进行匹配。Supports ABI string or 0x hash; ABI strings are hashed for matching.
  - 以上三者不能全部为 `null`，必须至少有一个为具体值。

## 同步流程 / Sync Flow
- 入口：`src/services/evmService.ts`
- 步骤：读取 `config/evm.json` → 计算 `beginBlockNumber` → 调用 Lambda 获取事件 → 返回事件列表。
- 说明：`fetchChainEvents(chainId, beginBlockNumber, blockLimit)` 仅负责获取数据，不包含 Redis 读写。
- 说明：按链逐一拉取并按区块高度排序后逐块处理，保证先出块先处理。Events are processed per chain and per block in ascending
  order.

## 路由与处理 / Routing & Handling
- 入口：`src/services/monitorService.ts`
- 步骤：加载并校验 `config/handlers.json` → 事件匹配规则 → 并发调用匹配 handler → 单个失败不影响其他 handler。
- 入口启动时调用 `initHandlersConfig()` 做一次配置校验。
- 说明：事务在 `evmEventMonitor` 中创建并传入 `routerEvent()`；任一 handler 失败则回滚该区块事务。Transactions are created
  in evmEventMonitor and passed to routerEvent; any failure triggers rollback.

## 同步状态 / Sync State

- 入口：`src/evmEventMonitor.ts`
- 说明：每个区块处理成功后才写入 Redis（`setLastSyncedBlock`），以事务提交成功为前提。Redis updates happen after each block
  completes successfully.

## 入口调度 / Scheduler
- `src/evmEventMonitor.ts` 负责定时拉取与路由。
- 使用运行锁避免前一次周期未完成时的重叠执行。
