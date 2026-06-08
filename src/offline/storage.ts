// Persistent-storage request + quota monitoring (point 7). Browsers can evict IndexedDB under
// pressure; persisted storage is far less likely to be cleared.

export async function requestPersistentStorage(): Promise<boolean> {
    try {
        if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
        if (navigator.storage?.persist) return await navigator.storage.persist();
    } catch {
        /* not supported */
    }
    return false;
}

export interface StorageEstimateInfo {
    usage: number;
    quota: number;
    percent: number;
}

export async function getStorageEstimate(): Promise<StorageEstimateInfo | null> {
    try {
        if (!navigator.storage?.estimate) return null;
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        return { usage, quota, percent: quota ? Math.round((usage / quota) * 100) : 0 };
    } catch {
        return null;
    }
}
