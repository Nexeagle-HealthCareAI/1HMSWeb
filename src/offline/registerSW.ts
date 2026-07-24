import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the Workbox service worker. `registerType: 'autoUpdate'` (vite.config) means a new
 * build activates and takes control automatically; we reload once it does so clients never run
 * a stale shell. Best-effort Background-Sync registration wakes the SW to nudge the page to drain.
 */
export function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() { updateSW(true); },   // auto-reload on new version
        onOfflineReady() { /* app shell cached */ },
    });

    navigator.serviceWorker?.ready
        .then((reg) => (reg as ServiceWorkerRegistration & { sync?: { register: (t: string) => Promise<void> } }).sync?.register('outbox-sync'))
        .catch(() => { /* Background Sync unsupported — connectivity-driven drain covers it */ });
}
