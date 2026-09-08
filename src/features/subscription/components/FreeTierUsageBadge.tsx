import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';

// Top-nav indicator of the free-tier monthly quota (IPD admission, OPD appointment
// confirm/walk-in, pathology order, pharmacy checkout) -- visible to every signed-in person at
// the hospital, not just Admin, since anyone hitting the limit needs to know why their action
// was blocked. Renders nothing for a hospital on a paid (Active) plan -- freeTierLimit is only
// non-null while still on the free tier (see SubscriptionController.GetUsage).
export const FreeTierUsageBadge: React.FC = () => {
    const navigate = useNavigate();
    const hospitalId = useAuthStore(state => state.hospitalId) || '';
    const { getUsage } = useSubscriptionApi();
    const { data: usage } = getUsage(hospitalId);

    if (!hospitalId || usage?.freeTierLimit == null || usage.freeTierUsedCount == null) return null;

    const { freeTierLimit: limit, freeTierUsedCount: used } = usage;
    const pct = Math.min(100, (used / limit) * 100);
    const isAtLimit = used >= limit;
    const isUrgent = !isAtLimit && pct >= 80;

    const tone = isAtLimit
        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
        : isUrgent
            ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70';
    const dot = isAtLimit ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <button
            type="button"
            onClick={() => navigate('/subscription')}
            title={isAtLimit ? 'Free monthly limit reached — upgrade to continue' : 'Free tier usage this month'}
            className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 sm:px-2.5 transition-colors shrink-0',
                tone
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot, (isAtLimit || isUrgent) && 'animate-pulse')} />
            <Gauge className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap">{used}/{limit}</span>
            <span className="hidden lg:inline text-xs font-medium opacity-80">free actions</span>
        </button>
    );
};

export default FreeTierUsageBadge;
