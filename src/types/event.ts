// 上游 Lambda 返回的 EVM 事件结构。
export interface EventEvm {
	id: number;
	eventId: string;
	chainId: number;
	blockNumber: number;
	blockHash: string;
	blockTimestamp: number;
	transactionHash: string;
	transactionIndex: number;
	logIndex: number;
	contractAddress: string;
	eventSignature: string;
	indexedTopic1: string | null;
	indexedTopic2: string | null;
	indexedTopic3: string | null;
	data: string | null;
	removed: boolean;
	dataSource: string;
	createdAt: Date;
	updatedAt: Date;
}
