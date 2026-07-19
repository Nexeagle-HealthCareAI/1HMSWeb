import React from 'react';
import { SystemConfiguration } from '@/features/hospital/components/SystemConfiguration';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';

export const SettingsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hospital Info</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your hospital configuration and public directory.</p>
        </div>
        <SubscriptionReadOnlyOverlay featureLabel="Managing hospital settings">
          <SystemConfiguration />
        </SubscriptionReadOnlyOverlay>
      </div>
    </div>
  );
};

export default SettingsPage;
