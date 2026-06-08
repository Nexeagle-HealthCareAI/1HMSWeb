import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { useAuthStore } from '@/store/authStore';
import { offlineDb, SCHEMA_VERSION } from './db';
import { encrypt, decrypt } from './crypto';

const CACHE_KEY = 'easyhms-query-cache';

// Partition the persisted cache per active hospital so switching hospitals (multi-hospital chains)
// never bleeds one hospital's cached PHI into another. The active hospital is reloaded on switch,
// so the right partition is hydrated on boot.
const scopedKey = (key: string) => {
    const hid = useAuthStore.getState().getHospitalId?.() ?? 'none';
    return `${key}::${hid}`;
};

// AsyncStorage adapter that encrypts the (PHI-bearing) Query cache blob before it lands in
// IndexedDB and decrypts on read. The cache is a single dehydrated blob per the persister.
const encryptedStorage = {
    getItem: async (key: string): Promise<string | null> => {
        const k = scopedKey(key);
        const rec = await offlineDb.kv.get(k);
        if (!rec) return null;
        try {
            return await decrypt({ iv: rec.iv, cipher: rec.cipher });
        } catch {
            // Key rotated / corrupt — drop it so we re-cache fresh.
            await offlineDb.kv.delete(k);
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        const { iv, cipher } = await encrypt(value);
        await offlineDb.kv.put({ key: scopedKey(key), iv, cipher, updatedAt: Date.now() });
    },
    removeItem: async (key: string): Promise<void> => {
        await offlineDb.kv.delete(scopedKey(key));
    },
};

export const offlinePersister = createAsyncStoragePersister({
    storage: encryptedStorage,
    key: CACHE_KEY,
    throttleTime: 1000,
});

// Passed to PersistQueryClientProvider. `buster` invalidates the whole cache when the offline
// schema/cache shape changes (point 6); `maxAge` caps how long stale PHI lingers on device.
export const PERSIST_BUSTER = `v${SCHEMA_VERSION}`;
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24h
