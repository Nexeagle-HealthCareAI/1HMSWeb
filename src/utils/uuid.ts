// crypto.randomUUID() is restricted to secure contexts (HTTPS or localhost) — it's undefined when
// the app is served over plain HTTP (e.g. by IP on a dev/self-hosted box without TLS configured
// yet), which throws "crypto.randomUUID is not a function" and crashes the whole render tree.
// crypto.getRandomValues() has no such restriction, so build a v4 UUID from it when randomUUID is
// unavailable; fall back further to Math.random() for the rare environment with no crypto at all
// (fine here — these IDs are client-side idempotency/dedupe keys, not security tokens).
export function generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
