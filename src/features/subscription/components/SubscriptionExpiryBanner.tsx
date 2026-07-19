import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    endDate: string;
}

const formatCountdown = (msRemaining: number): string => {
    const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
};

/**
 * Sticky red warning shown app-wide to Admin/AdminDoctor once the hospital's paid subscription is
 * within 3 days of SubscriptionEndDate — the runway before HospitalAccessFilter locks the account
 * down to just the Subscription page (see MainLayout). Ticks live so the urgency is visible rather
 * than a static "3 days left" that doesn't change until a page reload.
 */
export const SubscriptionExpiryBanner: React.FC<Props> = ({ endDate }) => {
    const navigate = useNavigate();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const msRemaining = new Date(endDate).getTime() - now;
    if (msRemaining <= 0) return null; // HospitalAccessFilter/MainLayout take over from here

    return (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-red-600 dark:bg-red-700 px-4 py-2 text-white text-sm font-semibold shadow-md">
            <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />
            <span>
                Your subscription ends in <span className="font-mono font-black tracking-wide">{formatCountdown(msRemaining)}</span> — renew now to avoid losing access.
            </span>
            <Button
                size="sm"
                variant="secondary"
                className="h-7 px-3 text-xs font-bold bg-white text-red-700 hover:bg-red-50"
                onClick={() => navigate('/subscription')}
            >
                Renew Now
            </Button>
        </div>
    );
};

export default SubscriptionExpiryBanner;
