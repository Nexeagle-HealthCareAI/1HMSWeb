import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, AlertTriangle } from 'lucide-react';

export const Legend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 border rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-teal-100 border border-teal-300 rounded"></div>
        <span className="text-sm font-medium">Morning Shift</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
        <span className="text-sm font-medium">Afternoon Shift</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-violet-100 border border-violet-300 rounded"></div>
        <span className="text-sm font-medium">Evening Shift</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-slate-200 border border-slate-400 rounded"></div>
        <span className="text-sm font-medium">Night Shift</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-500 rounded"></div>
        <span className="text-sm font-medium">Time Off</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded"></div>
        <span className="text-sm font-medium">Appointment</span>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <Clock className="h-3 w-3" />
        <span>Background events</span>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <User className="h-3 w-3" />
        <span>Patient appointments</span>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <AlertTriangle className="h-3 w-3" />
        <span>Time off & leaves</span>
      </div>
    </div>
  );
};
