import React from 'react';

export const GuidesLegend: React.FC = () => {
  return (
    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 border-t border-dashed border-gray-400"></div>
        <span>Safe margins</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-gray-400"></div>
        <span>Page border</span>
      </div>
    </div>
  );
};
