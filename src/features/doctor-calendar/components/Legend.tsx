import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, AlertTriangle } from 'lucide-react';

export const Legend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 border rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded shadow-sm opacity-50"></div>
        <span className="text-sm font-medium">Working Shifts</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded shadow-sm opacity-50 relative">
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">✕</span>
          </div>
        </div>
        <span className="text-sm font-medium">Override Shifts (Clickable)</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-600 rounded shadow-sm"></div>
        <span className="text-sm font-medium">Time Off (API)</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-orange-500 rounded"></div>
        <span className="text-sm font-medium">Time Off (Local)</span>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <Clock className="h-3 w-3" />
        <span>Blue: working hours, Red: unavailable periods</span>
      </div>
    </div>
  );
};
