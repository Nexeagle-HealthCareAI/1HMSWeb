import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/axiosClient';
import { ipdApiClient } from '@/services/ipdApiClient';
import { offlineDb, type OutboxItem } from './db';
import { pendingItems, markSyncing, markFailed, remove } from './outbox';
import { isReachable, onReachableChange } from './connectivity';

const MAX_TRIES = 6;
let queryClient: QueryClient | null = null;
let draining = false;
let installed = false;

export function setSyncQueryClient(qc: QueryClient) {
    queryClient = qc;
}

export function getQueryClient(): QueryClient | null {
    return queryClient;
}

function clientFor(item: OutboxItem) {
    return item.request.client === 'ipd' ? ipdApiClient : apiClient;
}

async function replay(item: OutboxItem): Promise<void> {
    const client = clientFor(item);
    const cfg = { headers: { 'Idempotency-Key': item.clientKey } };
    const { method, url, data } = item.request;
    if (method === 'post') await client.post(url, data, cfg);
    else if (method === 'put') await client.put(url, data, cfg);
    else if (method === 'patch') await client.patch(url, data, cfg);
    else await client.delete(url, cfg);
}

/** Drain the outbox FIFO. Safe to call repeatedly; only one drain runs at a time. */
export async function drainOutbox(): Promise<void> {
    if (draining || !isReachable()) return;
    draining = true;
    try {
        const items = await pendingItems();
        for (const item of items) {
            if (!isReachable()) break;
            if (item.id == null) continue;
            await markSyncing(item.id);
            try {
                await replay(item);
                await remove(item.id);
            } catch (err: unknown) {
                const status = (err as { response?: { status?: number } })?.response?.status;
                const serverMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

                // Conflict: last-write-wins (client already won by replaying); log for review and drop.
                if (status === 409) {
                    await offlineDb.conflicts.add({
                        clientKey: item.clientKey, entity: item.entity, at: Date.now(),
                        httpStatus: status, serverMessage, resolution: 'LWW_CLIENT_WINS', request: item.request,
                    });
                    await remove(item.id);
                    continue;
                }
                // Auth error: stop the drain — token likely expired; retry after re-login.
                if (status === 401 || status === 403) {
                    await markFailed(item.id, `Auth required (${status})`, item.tries + 1);
                    break;
                }
                const tries = item.tries + 1;
                const msg = serverMessage || (err as Error)?.message || 'Sync failed';
                await markFailed(item.id, msg, tries);
                // Give up on a poison message after MAX_TRIES so it can't block the queue forever.
                if (tries >= MAX_TRIES) { await remove(item.id); continue; }
                break; // stop on transient failure; next reconnect/tick retries
            }
        }
        // Reconcile UI with the server after a drain.
        queryClient?.invalidateQueries();
    } finally {
        draining = false;
    }
}

/** Wire drain triggers: on reconnect, on SW background-sync wake, and immediately at startup. */
export function startSyncEngine() {
    if (installed) return;
    installed = true;
    onReachableChange((reachable) => { if (reachable) void drainOutbox(); });
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
            if (e.data?.type === 'OUTBOX_SYNC') void drainOutbox();
        });
    }
    void drainOutbox();
}
