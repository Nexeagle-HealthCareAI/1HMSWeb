import { useCallback, useEffect, useRef, useState } from 'react';
import { dischargeSummaryApi } from '../services/dischargeSummaryApi';

const legacyKey = (admissionId: string) => `discharge-custom-fields:${admissionId}`;

const readLegacy = (admissionId: string): Record<string, string> => {
    try {
        const raw = localStorage.getItem(legacyKey(admissionId));
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const clearLegacy = (admissionId: string) => {
    try { localStorage.removeItem(legacyKey(admissionId)); } catch { /* storage unavailable */ }
};

/**
 * Values of the custom discharge-summary fields for one admission, persisted on the server
 * (previously browser localStorage only, so they never reached the saved/printed summary and were
 * invisible on other devices).
 *
 *  - Loads from the server; if the server has none yet but this browser holds an older local copy,
 *    that copy is migrated up once and the local one dropped.
 *  - `readOnly` (print button, signed summary) never writes.
 *  - Edits are debounced (~1 s) and only sent after the initial load, so a slow load can never
 *    overwrite server data with an empty object.
 */
export function useDischargeCustomFields(admissionId: string, readOnly = false) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [loaded, setLoaded] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const lastSaved = useRef<string>('{}');
    // Read inside the load effect without re-running it when a draft load flips `readOnly` (signed).
    const readOnlyRef = useRef(readOnly);
    readOnlyRef.current = readOnly;

    useEffect(() => {
        let cancelled = false;
        setLoaded(false);
        setValues({});
        (async () => {
            let server: Record<string, string> | null = null;
            try {
                server = await dischargeSummaryApi.getCustomFields(admissionId);
            } catch {
                server = null; // offline / API unavailable
            }
            if (cancelled) return;

            if (server && Object.keys(server).length > 0) {
                lastSaved.current = JSON.stringify(server);
                setValues(server);
                clearLegacy(admissionId);
            } else {
                const legacy = readLegacy(admissionId);
                if (Object.keys(legacy).length > 0) {
                    setValues(legacy);
                    if (server && !readOnlyRef.current) {
                        try {
                            await dischargeSummaryApi.saveCustomFields(admissionId, legacy);
                            lastSaved.current = JSON.stringify(legacy);
                            clearLegacy(admissionId);
                        } catch { /* keep the local copy; retried on next edit */ }
                    }
                }
            }
            if (!cancelled) setLoaded(true);
        })();
        return () => { cancelled = true; };
    }, [admissionId]);

    useEffect(() => {
        if (readOnly || !loaded) return;
        const json = JSON.stringify(values);
        if (json === lastSaved.current) return;
        const t = setTimeout(async () => {
            try {
                await dischargeSummaryApi.saveCustomFields(admissionId, values);
                lastSaved.current = json;
                setSaveError(null);
                clearLegacy(admissionId);
            } catch (e) {
                setSaveError(e instanceof Error ? e.message : 'Could not save the custom fields.');
            }
        }, 1000);
        return () => clearTimeout(t);
    }, [values, loaded, readOnly, admissionId]);

    const setValue = useCallback((key: string, value: string) => setValues(prev => ({ ...prev, [key]: value })), []);

    return { values, setValues, setValue, loaded, saveError };
}
