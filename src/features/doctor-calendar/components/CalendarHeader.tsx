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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border-b">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Doctor Name Display */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Dr. {doctorName}</span>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-auto p-1 text-sm font-medium"
            >
              {getViewLabel()}
            </Button>
            <span className="text-xs text-muted-foreground">Click for today</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View Switch */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={view === 'dayGridMonth' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('dayGridMonth')}
            className="h-7 px-3 text-xs"
          >
            Month
          </Button>
          <Button
            variant={view === 'timeGridWeek' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('timeGridWeek')}
            className="h-7 px-3 text-xs"
          >
            Week
          </Button>
          <Button
            variant={view === 'timeGridDay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('timeGridDay')}
            className="h-7 px-3 text-xs"
          >
            Day
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
                 <Button
           variant="outline"
           size="sm"
           onClick={onAddOverride}
           className="h-8 gap-1"
         >
           <Plus className="h-3 w-3" />
           Schedule & Time Off
         </Button>
      </div>
    </div>
  );
};
