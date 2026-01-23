import type {Transaction} from 'sequelize';
import type {EventEvm} from './event';

// Handler 参数：包含事件与同一事务上下文。
export interface HandlerParam {
    event: EventEvm;
    transaction: Transaction;
}
