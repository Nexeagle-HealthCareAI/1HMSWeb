import React from 'react';
import { SettingsForm } from '@/components/prescription/SettingsForm';
import { A4Preview } from '@/components/prescription/A4Preview';

export const PrescriptionSettings: React.FC = () => {

  return (
    <div className="h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Settings Panel - 1/2 width */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="h-screen overflow-y-scroll">
          <SettingsForm />
        </div>
      </div>

      {/* Enhanced Preview Panel - 1/2 width */}
      <div className="w-1/2 bg-white dark:bg-gray-800 shadow-xl">
        <div className="h-screen overflow-y-scroll bg-gray-50 dark:bg-gray-900">
          <div className="p-3 pb-48 flex flex-col items-center justify-start">
            <A4Preview />
          </div>
        </div>
      </div>
    </div>
  );
};
