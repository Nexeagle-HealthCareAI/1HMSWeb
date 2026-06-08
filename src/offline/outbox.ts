import { offlineDb, type OutboxItem } from './db';

export type NewOutboxItem = Omit<OutboxItem, 'id' | 'createdAt' | 'status' | 'tries'>;

export async function enqueue(item: NewOutboxItem): Promise<OutboxItem> {
    const row: OutboxItem = { ...item, createdAt: Date.now(), status: 'pending', tries: 0 };
    try {
        const id = await offlineDb.outbox.add(row);
        return { ...row, id };
    } catch (e) {
        // Most likely a storage-quota error — never silently drop a clinical write.
        throw new Error('Could not save your change for later. Device storage may be full.');
    }
}

/** FIFO list of queued items (oldest first). Successful items are deleted, so all rows are pending sync. */
export function pendingItems(): Promise<OutboxItem[]> {
    return offlineDb.outbox.orderBy('createdAt').toArray();
}

export function countPending(): Promise<number> {
    return offlineDb.outbox.where('status').anyOf('pending', 'syncing', 'failed').count();
}

export async function markSyncing(id: number): Promise<void> {
    await offlineDb.outbox.update(id, { status: 'syncing' });
}

export async function markFailed(id: number, error: string, tries: number): Promise<void> {
    await offlineDb.outbox.update(id, { status: 'failed', lastError: error, tries });
}

export async function markPending(id: number, tries: number): Promise<void> {
    await offlineDb.outbox.update(id, { status: 'pending', tries });
}

export async function remove(id: number): Promise<void> {
    await offlineDb.outbox.delete(id);
}

export async function clearOutbox(): Promise<void> {
    await offlineDb.outbox.clear();
}
