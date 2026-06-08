import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Legend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-6 p-4 bg-gradient-to-r from-gray-50/80 to-slate-50/80 border border-gray-200/60 rounded-xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 rounded-lg border border-brand-200/50">
          <div className="w-4 h-4 bg-gradient-to-br from-brand-500 to-brand-600 rounded-md shadow-sm"></div>
          <span className="text-sm font-semibold text-brand-800">
            {t('doctorCalendar.legend.defaultShifts')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200/50">
          <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 rounded-md shadow-sm relative">
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-700 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">✕</span>
            </div>
          </div>
          <span className="text-sm font-semibold text-green-800">
            {t('doctorCalendar.legend.personalizedShifts')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200/50">
          <div className="w-4 h-4 bg-gradient-to-br from-red-600 to-red-700 rounded-md shadow-sm"></div>
          <span className="text-sm font-semibold text-red-800">
            {t('doctorCalendar.legend.unavailable')}
          </span>
        </div>
      </div>
      
      
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100/60 rounded-lg border border-gray-200/50">
        <Clock className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {t('doctorCalendar.legend.caption')}
        </span>
      </div>
    </div>
  );
};
