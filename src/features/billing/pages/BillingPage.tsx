import React from 'react';
import { Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const BillingPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 m-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4">
                <Receipt className="h-10 w-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('header.billing') || 'Billing & Subscription'}
            </h3>
            <p className="text-gray-500 max-w-md text-center">
                This feature is currently under development.
                <br />
                <span className="font-medium text-indigo-600 dark:text-indigo-400 sm:inline-block mt-1">
                    (Upcoming)
                </span>
            </p>
        </div>
    );
};

export default BillingPage;
