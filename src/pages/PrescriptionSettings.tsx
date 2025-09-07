import React from 'react';
import { SettingsForm } from '@/components/prescription/SettingsForm';
import { A4Preview } from '@/components/prescription/A4Preview';

export const PrescriptionSettings: React.FC = () => {
  return (
    <div className="h-full flex overflow-hidden">
      {/* Settings Panel - 2/3 width */}
      <div className="w-2/3 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Prescription Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your prescription template layout and styling
            </p>
          </div>
          
          {/* Settings Form */}
          <div className="flex-1 p-4 min-h-0">
            <SettingsForm />
          </div>
        </div>
      </div>

      {/* Preview Panel - 1/3 width */}
      <div className="w-1/3 flex-shrink-0 bg-gray-50 dark:bg-gray-900">
        <div className="h-full flex flex-col">
          {/* Preview Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white">
              Live Preview
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              A4 prescription preview
            </p>
          </div>
          
          {/* Preview Content */}
          <div className="flex-1 p-4 min-h-0 flex flex-col items-center justify-start overflow-y-auto">
            <A4Preview />
          </div>
        </div>
      </div>
    </div>
  );
};
