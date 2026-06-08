import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, RotateCcw, User } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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
  const { t } = useTranslation();
  const { getUserId } = useAuthStore();
  const userId = getUserId();
  const { data: userDetailsResponse } = useUserDetails(userId || '');

  const fallbackDoctorName = t('doctorCalendar.doctorFallback');
  // Get user name or fallback to contact number
  const doctorDisplayName =
    userDetailsResponse?.userProfile?.fullName || userDetailsResponse?.mobileNumber || fallbackDoctorName;
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
        return t('doctorCalendar.weekOf', { date: format(currentDate, 'MMM dd, yyyy') });
      case 'timeGridDay':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      default:
        return format(currentDate, 'MMM dd, yyyy');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-gradient-to-r from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm">
      {/* Left Section - Doctor Info and Navigation */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        {/* Doctor Name Display */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-900/20 dark:to-brand-900/20 rounded-lg border border-brand-100/50 dark:border-brand-800/50">
          <div className="p-1.5 bg-brand-100 dark:bg-brand-800 rounded-md">
            <User className="h-3 w-3 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-brand-900 dark:text-brand-100">
              {t('doctorCalendar.doctorPrefix', { name: doctorDisplayName })}
            </span>
            <span className="text-xs text-brand-600 dark:text-brand-300">{t('doctorCalendar.calendarView')}</span>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Button>

          <div className="flex flex-col items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-auto p-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-all duration-200",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {getViewLabel()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && onDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span
              className="text-xs text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-brand-600"
              onClick={handleToday}
            >
              {t('doctorCalendar.clickForToday')}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>

        {/* View Switch */}
        <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-700/80 rounded-lg p-1 border border-gray-200/50 dark:border-gray-600/50">
          <Button
            variant={view === 'dayGridMonth' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('dayGridMonth')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all duration-200 ${view === 'dayGridMonth'
                ? 'bg-brand-600 text-white shadow-md hover:bg-brand-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
              }`}
          >
            {t('doctorCalendar.views.month')}
          </Button>
          <Button
            variant={view === 'timeGridWeek' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('timeGridWeek')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all duration-200 ${view === 'timeGridWeek'
                ? 'bg-brand-600 text-white shadow-md hover:bg-brand-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
              }`}
          >
            {t('doctorCalendar.views.week')}
          </Button>
          <Button
            variant={view === 'timeGridDay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('timeGridDay')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all duration-200 ${view === 'timeGridDay'
                ? 'bg-brand-600 text-white shadow-md hover:bg-brand-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
              }`}
          >
            {t('doctorCalendar.views.day')}
          </Button>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddOverride}
          className="h-8 gap-1.5 px-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/30 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 font-medium text-xs"
        >
          <Plus className="h-3 w-3" />
          {t('doctorCalendar.scheduleAndTimeOff')}
        </Button>
      </div>
    </div>
  );
};
