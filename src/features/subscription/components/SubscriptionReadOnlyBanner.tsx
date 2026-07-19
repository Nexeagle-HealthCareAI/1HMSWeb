import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    isAdminRole: boolean;
}

/**
 * Sticky, persistent banner shown app-wide once the hospital's subscription is actually
 * Expired/Blocked — replaces the old full-page lockout (SubscriptionExpiredScreen /
 * forced-redirect-to-/subscription in MainLayout). The app stays fully navigable and viewable;
 * write actions are what's blocked (HospitalAccessFilter.cs server-side, useSubscriptionReadOnly
 * gating individual buttons client-side). Only Admin/AdminDoctor can act on a renewal, so only
 * they get the CTA — everyone else is told to go through their administrator.
 */
export const SubscriptionReadOnlyBanner: React.FC<Props> = ({ isAdminRole }) => {
    const navigate = useNavigate();

    return (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-amber-500 dark:bg-amber-600 px-4 py-2 text-white text-sm font-semibold shadow-md">
            <Lock className="h-4 w-4 shrink-0" />
            {isAdminRole ? (
                <>
                    <span>Your subscription has expired — you can view everything, but new changes are blocked until you renew.</span>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-3 text-xs font-bold bg-white text-amber-700 hover:bg-amber-50"
                        onClick={() => navigate('/subscription')}
                    >
                        Renew Now
                    </Button>
                </>
            ) : (
                <span>Your hospital's subscription has expired — you can view everything, but new changes are blocked. Contact your administrator to renew.</span>
            )}
        </div>
    );
};

export default SubscriptionReadOnlyBanner;
