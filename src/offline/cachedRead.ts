import { getQueryClient } from './syncEngine';

/**
 * Behavior-preserving offline read: runs the existing service call, mirrors the result into the
 * TanStack Query cache under a stable key (so the encrypted persister keeps it for offline), and
 * — when the network fails — returns the last cached value instead of throwing. Drop-in around an
 * existing `await service.getX()` so a page's state logic is untouched.
 */
export async function offlineCachedRead<T>(key: unknown[], fn: () => Promise<T>): Promise<T> {
    const qc = getQueryClient();
    if (!qc) return fn();
    try {
        const data = await fn();
        qc.setQueryData(key, data as unknown);
        return data;
    } catch (err) {
        const cached = qc.getQueryData<T>(key);
        if (cached !== undefined) return cached;
        throw err;
    }
}
