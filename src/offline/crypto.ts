import { offlineDb } from './db';

const KEY_ID = 'cache-key';
let cachedKey: CryptoKey | null = null;

/**
 * Returns a per-device AES-GCM key for encrypting cached PHI at rest. The key is
 * **non-extractable** (its raw bytes can never be read back into JS) and is stored as a
 * CryptoKey object in IndexedDB, so it survives reloads. Cleared on logout via wipeKeys().
 */
export async function getOrCreateKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;
    const existing = await offlineDb.keys.get(KEY_ID);
    if (existing?.key) {
        cachedKey = existing.key;
        return existing.key;
    }
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false, // non-extractable
        ['encrypt', 'decrypt'],
    );
    await offlineDb.keys.put({ id: KEY_ID, key });
    cachedKey = key;
    return key;
}

export interface Encrypted {
    iv: Uint8Array;
    cipher: ArrayBuffer;
}

export async function encrypt(plaintext: string): Promise<Encrypted> {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(plaintext);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return { iv, cipher };
}

export async function decrypt(enc: Encrypted): Promise<string> {
    const key = await getOrCreateKey();
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: enc.iv }, key, enc.cipher);
    return new TextDecoder().decode(plain);
}

export async function wipeKeys(): Promise<void> {
    cachedKey = null;
    await offlineDb.keys.clear();
}
