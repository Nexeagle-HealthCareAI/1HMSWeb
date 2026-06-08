import React from 'react';
import { CloudOff, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectivity, useOutbox, drainOutbox } from '@/offline';

/**
 * App-wide connectivity + sync status pill (point 9). Shows offline state and the number of
 * queued writes; lets the user trigger a sync once back online.
 */
export const OfflineBanner: React.FC = () => {
    const { reachable } = useConnectivity();
    const { count } = useOutbox();

    // Nothing to show when online with an empty queue.
    if (reachable && count === 0) return null;

    const offline = !reachable;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
            <div
                className={cn(
                    'pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2 shadow-lg backdrop-blur-sm text-sm font-medium',
                    offline
                        ? 'bg-amber-50/95 border-amber-300 text-amber-800'
                        : 'bg-brand-50/95 border-brand-300 text-brand-800',
                )}
                role="status"
                aria-live="polite"
            >
                {offline ? (
                    <>
                        <CloudOff className="h-4 w-4 shrink-0" />
                        <span>You're offline{count > 0 ? ` · ${count} change${count > 1 ? 's' : ''} saved on this device` : ' · your work is saved here'}</span>
                    </>
                ) : (
                    <>
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        <span>Uploading {count} change{count > 1 ? 's' : ''}…</span>
                        <button
                            type="button"
                            onClick={() => void drainOutbox()}
                            className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/70 hover:bg-white px-2 py-0.5 text-xs font-semibold text-brand-700"
                        >
                            <RefreshCw className="h-3 w-3" /> Try again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

/** Small inline "queued" badge components can drop next to an optimistic row. */
export const QueuedBadge: React.FC<{ synced?: boolean; className?: string }> = ({ synced, className }) => (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5',
        synced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700', className)}>
        {synced ? <CheckCircle2 className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />} {synced ? 'Uploaded' : 'Saved offline'}
    </span>
);
