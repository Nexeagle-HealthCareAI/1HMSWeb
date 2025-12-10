import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onDateSelect
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';

  // Generate next 5 days
  const getNext5Days = () => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, i) => addDays(today, i));
  };

  const next5Days = getNext5Days();

  const formatQuickLabel = (date: Date, isToday: boolean) => {
    if (isToday) return t('dateSelector.today');
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  };

  const formatQuickDate = (date: Date) =>
    new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit' }).format(date);

  const formatSelectedDate = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    }).format(date);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('dateSelector.title')}
      </h3>
      
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Quick date buttons for next 5 days */}
        {next5Days.map((date, index) => (
          <Button
            key={index}
            variant={isSameDay(date, selectedDate) ? "default" : "outline"}
            className={cn(
              "flex-col h-16 px-4 min-w-[100px]",
              isSameDay(date, selectedDate) 
                ? "bg-healthcare-primary hover:bg-healthcare-primary/90" 
                : "hover:bg-muted"
            )}
            onClick={() => onDateSelect(date)}
          >
            <span className="text-xs opacity-75">
              {formatQuickLabel(date, index === 0)}
            </span>
            <span className="text-sm font-semibold">
              {formatQuickDate(date)}
            </span>
          </Button>
        ))}

        {/* Calendar picker for other dates */}
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex-col h-16 px-4 min-w-[100px] hover:bg-muted"
            >
              <Calendar className="h-4 w-4 mb-1" />
              <span className="text-xs">{t('dateSelector.otherDate')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateSelect(date);
                  setShowCalendar(false);
                }
              }}
              disabled={(date) => date < new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card className="p-3 bg-muted">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('dateSelector.selectedDateLabel')}</span>
          <span className="font-semibold text-healthcare-primary">
            {formatSelectedDate(selectedDate)}
          </span>
        </div>
      </Card>
    </div>
  );
};