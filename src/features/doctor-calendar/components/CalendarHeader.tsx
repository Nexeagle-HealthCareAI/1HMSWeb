import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, RotateCcw, User } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { format } from 'date-fns';

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  onViewChange: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => void;
  onAddOverride: () => void;
  onRegenerateDay?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onDateChange,
  view,
  onViewChange,
  onAddOverride,
  onRegenerateDay
}) => {
  const { getUserId } = useAuthStore();
  const userId = getUserId();
  const { data: userDetailsResponse } = useUserDetails(userId || '');
  
  // Get user name or fallback to contact number
  const doctorName = userDetailsResponse?.userProfile?.fullName || userDetailsResponse?.mobileNumber || 'Doctor';
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'dayGridMonth') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'timeGridWeek') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === 'timeGridDay') {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'dayGridMonth') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'timeGridWeek') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === 'timeGridDay') {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getViewLabel = () => {
    switch (view) {
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy');
      case 'timeGridWeek':
        return `Week of ${format(currentDate, 'MMM dd, yyyy')}`;
      case 'timeGridDay':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      default:
        return format(currentDate, 'MMM dd, yyyy');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 bg-gradient-to-r from-white via-gray-50/50 to-white border-b border-gray-200/60 shadow-sm">
      {/* Left Section - Doctor Info and Navigation */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Doctor Name Display */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-blue-900">Dr. {doctorName}</span>
            <span className="text-xs text-blue-600">Calendar View</span>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="h-10 w-10 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </Button>
          
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-auto p-3 text-base font-semibold text-gray-800 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
            >
              {getViewLabel()}
            </Button>
            <span className="text-xs text-gray-500 font-medium">Click for today</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-10 w-10 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* View Switch */}
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1.5 border border-gray-200/50">
          <Button
            variant={view === 'dayGridMonth' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('dayGridMonth')}
            className={`h-8 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
              view === 'dayGridMonth' 
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Month
          </Button>
          <Button
            variant={view === 'timeGridWeek' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('timeGridWeek')}
            className={`h-8 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
              view === 'timeGridWeek' 
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Week
          </Button>
          <Button
            variant={view === 'timeGridDay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('timeGridDay')}
            className={`h-8 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
              view === 'timeGridDay' 
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Day
          </Button>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddOverride}
          className="h-10 gap-2 px-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all duration-200 font-medium"
        >
          <Plus className="h-4 w-4" />
          Schedule & Time Off
        </Button>
      </div>
    </div>
  );
};
