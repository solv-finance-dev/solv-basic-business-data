// 模板事件监听地址结构。
export interface TemplateAddress {
    id: number;
    chainId: number;
    eventSignature: string;
    address: string;
    createdAt: Date;
    updatedAt: Date;
}
