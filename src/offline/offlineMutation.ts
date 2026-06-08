import { isReachable } from './connectivity';
import { enqueue } from './outbox';
import type { OutboxItem } from './db';

export interface OfflineMutationOptions<T> {
    entity: string;                                   // 'appointment', 'vitals', …
    opType: OutboxItem['opType'];
    client: 'api' | 'ipd';                            // which axios client replays it
    method: OutboxItem['request']['method'];
    url: string;
    data?: unknown;
    label?: string;
    hospitalId?: string;
    /** The normal online call (used when reachable). */
    run: () => Promise<T>;
    /** Apply an optimistic cache update so the UI reacts instantly when queued. */
    optimistic?: (clientKey: string) => void;
    /** Build the synthetic response returned to the caller when queued offline. */
    synthetic: (clientKey: string) => T;
}

export interface OfflineMutationResult<T> {
    queued: boolean;
    clientKey?: string;
    data: T;
}

/**
 * Run a mutation online, or — when the device is unreachable — queue it to the outbox, apply
 * an optimistic update, and return a synthetic response. The sync engine replays it on reconnect.
 */
export async function offlineMutation<T>(opts: OfflineMutationOptions<T>): Promise<OfflineMutationResult<T>> {
    if (isReachable()) {
        const data = await opts.run();
        return { queued: false, data };
    }
    const clientKey = crypto.randomUUID();
    opts.optimistic?.(clientKey);
    await enqueue({
        clientKey,
        entity: opts.entity,
        opType: opts.opType,
        request: { client: opts.client, method: opts.method, url: opts.url, data: opts.data },
        label: opts.label,
        hospitalId: opts.hospitalId,
    });
    return { queued: true, clientKey, data: opts.synthetic(clientKey) };
}
