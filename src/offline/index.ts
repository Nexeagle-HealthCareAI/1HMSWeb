import type { QueryClient } from '@tanstack/react-query';
import { offlineDb } from './db';
import { wipeKeys } from './crypto';
import { startConnectivity } from './connectivity';
import { startSyncEngine, setSyncQueryClient } from './syncEngine';
import { requestPersistentStorage } from './storage';
import { registerServiceWorker } from './registerSW';

export * from './connectivity';
export * from './useOutbox';
export * from './offlineMutation';
export { offlineDb, SCHEMA_VERSION } from './db';
export { offlinePersister, PERSIST_BUSTER, PERSIST_MAX_AGE } from './persister';
export { getStorageEstimate } from './storage';
export { drainOutbox } from './syncEngine';
export { countPending } from './outbox';
export { offlineCachedRead } from './cachedRead';

let initialized = false;

/** Boot the offline subsystem once, at app startup. */
export function initOffline(queryClient: QueryClient) {
    if (initialized) return;
    initialized = true;
    setSyncQueryClient(queryClient);
    startConnectivity();
    startSyncEngine();
    void requestPersistentStorage();
    registerServiceWorker();
}

/**
 * Clear everything sensitive on logout: the encrypted PHI cache, the encryption key, conflict
 * log and any queued writes (their bodies contain PHI). Call before clearing the auth session.
 */
export async function wipeAll(): Promise<void> {
    try {
        await Promise.all([
            offlineDb.kv.clear(),
            offlineDb.conflicts.clear(),
            offlineDb.outbox.clear(),
        ]);
        await wipeKeys();
    } catch {
        /* best-effort */
    }
}
