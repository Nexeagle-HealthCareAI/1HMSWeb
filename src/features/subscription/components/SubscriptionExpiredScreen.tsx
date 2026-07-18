import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    onLogout: () => void;
}

/**
 * Full-screen lockout shown to non-admin roles once the hospital's trial/subscription has
 * expired. Only Admin/AdminDoctor can act on a renewal (see /subscription), so everyone else is
 * told to go through their administrator rather than seeing a broken, half-blocked app shell.
 */
export const SubscriptionExpiredScreen: React.FC<Props> = ({ onLogout }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl p-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-800/50">
                    <ShieldAlert className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Subscription Expired</h1>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Your hospital's trial or subscription has ended. Access to EasyHMS is currently locked.
                    Please contact your administrator to renew the subscription and restore access.
                </p>
                <Button
                    variant="outline"
                    className="mt-6 w-full"
                    onClick={onLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" /> Log out
                </Button>
            </div>
        </div>
    );
};

export default SubscriptionExpiredScreen;
