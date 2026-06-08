import Dexie, { type Table } from 'dexie';

// Bump when the offline schema or cache shape changes. Bumping purges the derived read-cache
// (`kv`) but preserves the user's queued writes (`outbox`).
export const SCHEMA_VERSION = 1;

export type OutboxStatus = 'pending' | 'syncing' | 'failed';

export interface OutboxItem {
    id?: number;
    clientKey: string;        // UUID — idempotency key, also the optimistic id
    createdAt: number;
    entity: string;           // e.g. 'appointment' — drives query invalidation + badges
    opType: 'create' | 'update' | 'delete';
    request: {
        client: 'api' | 'ipd'; // which axios client replays it
        method: 'post' | 'put' | 'patch' | 'delete';
        url: string;
        data?: unknown;
    };
    label?: string;           // human summary for the pending list ("Appointment · Asha")
    status: OutboxStatus;
    tries: number;
    lastError?: string;
    hospitalId?: string;
}

export interface ConflictRecord {
    id?: number;
    clientKey: string;
    entity: string;
    at: number;
    httpStatus?: number;
    serverMessage?: string;
    resolution: string;       // e.g. 'LWW_CLIENT_WINS'
    request: unknown;
}

// Encrypted blobs (TanStack Query cache) + small meta values.
export interface KvRecord {
    key: string;
    iv: Uint8Array;
    cipher: ArrayBuffer;
    updatedAt: number;
}

// Stores the non-extractable AES-GCM CryptoKey (raw bytes never exposed to JS).
export interface KeyRecord {
    id: string;               // 'cache-key'
    key: CryptoKey;
}

class OfflineDB extends Dexie {
    outbox!: Table<OutboxItem, number>;
    conflicts!: Table<ConflictRecord, number>;
    kv!: Table<KvRecord, string>;
    keys!: Table<KeyRecord, string>;

    constructor() {
        super('easyhms-offline');
        this.version(1).stores({
            outbox: '++id, clientKey, status, entity, createdAt',
            conflicts: '++id, clientKey, entity, at',
            kv: 'key, updatedAt',
            keys: 'id',
        });
    }
}

export const offlineDb = new OfflineDB();
