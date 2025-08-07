import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { format, addDays, isSameDay } from 'date-fns';
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

  // Generate next 5 days
  const getNext5Days = () => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, i) => addDays(today, i));
  };

  const next5Days = getNext5Days();

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Select Date
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
              {index === 0 ? 'Today' : format(date, 'EEE')}
            </span>
            <span className="text-sm font-semibold">
              {format(date, 'MMM dd')}
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
              <span className="text-xs">Other Date</span>
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
          <span className="text-muted-foreground">Selected Date:</span>
          <span className="font-semibold text-healthcare-primary">
            {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
          </span>
        </div>
      </Card>
    </div>
  );
};