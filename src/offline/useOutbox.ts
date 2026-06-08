import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDb } from './db';

/** Live pending-write count + items, for the offline banner and "Queued" badges. */
export function useOutbox() {
    const items = useLiveQuery(() => offlineDb.outbox.orderBy('createdAt').toArray(), [], []);
    const count = items?.length ?? 0;
    return { items: items ?? [], count };
}

/** Live count of queued writes for a single entity (e.g. 'appointment'). */
export function useEntityPending(entity: string) {
    return useLiveQuery(() => offlineDb.outbox.where('entity').equals(entity).count(), [entity], 0) ?? 0;
}
