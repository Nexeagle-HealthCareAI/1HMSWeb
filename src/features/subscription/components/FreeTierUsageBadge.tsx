import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';

// Top-nav indicator of the free-tier monthly quota (IPD admission, OPD appointment
// confirm/walk-in, pathology order, pharmacy checkout) -- visible to every signed-in person at
// the hospital, not just Admin, since anyone hitting the limit needs to know why their action
// was blocked. Renders nothing for a hospital on a paid (Active) plan -- freeTierLimit is only
// non-null while still on the free tier (see SubscriptionController.GetUsage).
// Styled as a standout perk (not a quiet utility indicator) since free patient entries are one
// of the product's selling points -- worth advertising every time someone looks at the nav bar,
// not just flagging trouble once the quota is nearly gone.
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
    const remaining = Math.max(0, limit - used);

    const tone = isAtLimit
        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
        : isUrgent
            ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            : 'border-brand-300 dark:border-brand-700 bg-gradient-to-r from-brand-50 to-blue-50 dark:from-brand-900/30 dark:to-blue-900/20 text-brand-700 dark:text-brand-300 hover:from-brand-100 hover:to-blue-100 dark:hover:from-brand-900/50 dark:hover:to-blue-900/40';
    const dot = isAtLimit ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <button
            type="button"
            onClick={() => navigate('/subscription')}
            title={isAtLimit ? 'Free monthly limit reached — upgrade to continue' : `${remaining} free patient entries left this month`}
            className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors shrink-0 shadow-sm',
                tone
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot, (isAtLimit || isUrgent) && 'animate-pulse')} />
            <Gift className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-black whitespace-nowrap">{used}/{limit}</span>
            <span className="hidden md:inline text-xs font-bold whitespace-nowrap">
                {isAtLimit ? 'Free entries used up' : 'Free patient entries'}
            </span>
        </button>
    );
};

export default FreeTierUsageBadge;
