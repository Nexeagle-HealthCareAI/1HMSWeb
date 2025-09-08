import React from 'react';
import { SettingsForm } from '@/components/prescription/SettingsForm';
import { A4Preview } from '@/components/prescription/A4Preview';
import { FileText, Eye, Palette, Image, User } from 'lucide-react';

export const PrescriptionSettings: React.FC = () => {
  return (
    <div className="h-full flex overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Settings Panel - 2/3 width */}
      <div className="w-2/3 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
        <div className="h-full flex flex-col">
          {/* Compact Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Prescription Settings
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customize your prescription layout and appearance
                </p>
              </div>
            </div>
            
            {/* Compact Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-md p-2 border border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-1">
                  <Palette className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Layout</span>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Margins & orientation</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-md p-2 border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-1">
                  <Image className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Images</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">Header & footer</p>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-md p-2 border border-orange-200 dark:border-orange-700">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Doctor Info</span>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400">Signature & details</p>
              </div>
            </div>
          </div>
          
          {/* Settings Form */}
          <div className="flex-1 p-4 min-h-0 overflow-y-auto bg-white dark:bg-gray-800">
            <SettingsForm />
          </div>
        </div>
      </div>

      {/* Enhanced Preview Panel - 1/3 width */}
      <div className="w-1/3 flex-shrink-0 bg-white dark:bg-gray-800 shadow-xl">
        <div className="h-full flex flex-col">
          {/* Compact Preview Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-md">
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                  Live Preview
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Real-time preview
                </p>
              </div>
            </div>
          </div>
          
          {/* Preview Content */}
          <div className="flex-1 p-4 min-h-0 flex flex-col items-center justify-start overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <A4Preview />
          </div>
        </div>
      </div>
    </div>
  );
};
