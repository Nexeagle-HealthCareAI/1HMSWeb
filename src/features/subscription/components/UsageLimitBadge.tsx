import React from 'react';
import { cn } from '@/lib/utils';

interface UsageLimitBadgeProps {
    label: string;
    current: number;
    max: number | null;
    isLoading?: boolean;
    className?: string;
}

// Compact "X / Y used" indicator shown against a hospital's plan limits — used in Bed Management
// (beds) and User Management (doctors) so admins see their headroom before hitting the limit that
// SubscriptionLimitHelper enforces server-side. null max = unlimited (Enterprise tier).
export const UsageLimitBadge: React.FC<UsageLimitBadgeProps> = ({ label, current, max, isLoading, className }) => {
    if (isLoading) {
        return (
            <div className={cn('flex items-center gap-2 text-xs text-muted-foreground animate-pulse', className)}>
                <span className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        );
    }

    if (max == null) {
        return (
            <div className={cn('flex items-center gap-1.5 text-xs font-medium', className)}>
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{current} used</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">· Unlimited plan</span>
            </div>
        );
    }

    const pct = max > 0 ? Math.min(100, (current / max) * 100) : 100;
    const atLimit = current >= max;
    const nearLimit = !atLimit && pct >= 80;

    const textColor = atLimit
        ? 'text-red-600 dark:text-red-400'
        : nearLimit
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-slate-700 dark:text-slate-200';
    const barColor = atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <div className={cn('flex items-center gap-2', className)} title={`${label}: ${current} of ${max} used`}>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}:</span>
            <span className={cn('text-xs font-bold whitespace-nowrap', textColor)}>{current} / {max} used</span>
            <div className="hidden sm:block w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
            </div>
            {atLimit && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                    Limit reached
                </span>
            )}
        </div>
    );
};
