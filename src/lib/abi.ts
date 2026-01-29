import fs from 'node:fs';
import path from 'node:path';
import {Interface} from 'ethers';
import type {EventEvm} from '../types/event';

const abiCache = new Map<string, Interface>();

function getAbiInterface(fileName: string): Interface {
    const cached = abiCache.get(fileName);
    if (cached) {
        return cached;
    }

    const filePath = path.resolve(process.cwd(), 'abis', fileName);
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const iface = new Interface(parsed as Interface['fragments']);

    abiCache.set(fileName, iface);
    return iface;
}

export function decodeEventFromAbi(fileName: string, event: EventEvm): Record<string, unknown> {
    const iface = getAbiInterface(fileName);
    const topics = [
        event.eventSignature,
        event.indexedTopic1,
        event.indexedTopic2,
        event.indexedTopic3,
    ].filter((topic): topic is string => typeof topic === 'string' && topic.length > 0);
    const data = event.data ?? '0x';
    const parsed = iface.parseLog({topics, data});
    if (!parsed) {
        // 未匹配到事件，直接抛出以便上游处理。
        throw new Error(`Unable to parse log for ${fileName}.`);
    }
    const values: Record<string, unknown> = {};

    parsed.fragment.inputs.forEach((input, index) => {
        values[input.name] = parsed.args[index];
    });

    return values;
}
