import React from 'react';
import { useLocalStore } from '../../hooks/useLocalStore';
import { TemplateState, DEFAULT_TEMPLATE_STATE } from '../../types/prescription';
import { Sidebar } from './Sidebar';
import { A4Preview } from './A4Preview';
import { GuidesLegend } from './GuidesLegend';

export const PrescriptionEditor: React.FC = () => {
  const [state, setState] = useLocalStore<TemplateState>('prescription-template', DEFAULT_TEMPLATE_STATE);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prescription Template Editor
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Design your prescription template with header, footer, and signature placement
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-6">
            <Sidebar state={state} setState={setState} />
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <GuidesLegend />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <A4Preview state={state} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
