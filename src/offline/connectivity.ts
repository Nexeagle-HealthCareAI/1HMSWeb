import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { API_BASE_URL } from '@/app/api';

interface ConnectivityState {
    navigatorOnline: boolean;
    reachable: boolean;        // real reachability (source of truth) — navigator.onLine is a hint
    lastPingAt: number | null;
    setReachable: (v: boolean) => void;
    setNavigatorOnline: (v: boolean) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
    navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    reachable: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastPingAt: null,
    setReachable: (v) => set({ reachable: v, lastPingAt: Date.now() }),
    setNavigatorOnline: (v) => set({ navigatorOnline: v }),
}));

const HEALTH_URL = `${API_BASE_URL.replace(/\/$/, '')}/health`;
const OK_INTERVAL = 20_000;
const FAIL_MIN = 4_000;
const FAIL_MAX = 20_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let failBackoff = FAIL_MIN;
let started = false;
const listeners = new Set<(reachable: boolean) => void>();

/** Subscribe to reachability transitions (e.g. to kick the sync engine on reconnect). */
export function onReachableChange(fn: (reachable: boolean) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

async function ping(): Promise<boolean> {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(HEALTH_URL, { method: 'GET', cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        return res.ok;
    } catch {
        return false;
    }
}

async function tick() {
    const prev = useConnectivityStore.getState().reachable;
    const ok = navigator.onLine ? await ping() : false;
    if (ok !== prev) {
        useConnectivityStore.getState().setReachable(ok);
        listeners.forEach((l) => l(ok));
    } else {
        useConnectivityStore.setState({ lastPingAt: Date.now() });
    }
    failBackoff = ok ? FAIL_MIN : Math.min(failBackoff * 1.5, FAIL_MAX);
    schedule(ok ? OK_INTERVAL : failBackoff);
}

function schedule(delay: number) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, delay);
}

export function startConnectivity() {
    if (started) return;
    started = true;
    const onOnline = () => { useConnectivityStore.getState().setNavigatorOnline(true); schedule(0); };
    const onOffline = () => {
        useConnectivityStore.getState().setNavigatorOnline(false);
        useConnectivityStore.getState().setReachable(false);
        listeners.forEach((l) => l(false));
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    schedule(0);
}

/** Hook: `const { reachable } = useConnectivity()`. */
export const useConnectivity = () =>
    useConnectivityStore(useShallow((s) => ({ reachable: s.reachable, navigatorOnline: s.navigatorOnline, lastPingAt: s.lastPingAt })));

export const isReachable = () => useConnectivityStore.getState().reachable;
