import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarService, CalendarViewType, DateRange } from '../services/calendarService';
import { format, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DateRangeSelectionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewType: CalendarViewType;
  selectedDate: Date;
  onConfirm: (dateRange: DateRange) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export const DateRangeSelectionPopup: React.FC<DateRangeSelectionPopupProps> = ({
  open,
  onOpenChange,
  viewType,
  selectedDate,
  onConfirm,
  onCancel,
  title,
  description
}) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  // Initialize date range when component opens
  useEffect(() => {
    if (open) {
      if (viewType === 'block' && customStartDate && customEndDate) {
        // Use custom date range for block selection
        setDateRange(CalendarService.getBlockDateRange(customStartDate, customEndDate));
      } else {
        // Use automatic date range based on view type
        setDateRange(CalendarService.getDateRange(viewType, selectedDate));
      }
    }
  }, [open, viewType, selectedDate, customStartDate, customEndDate]);

  const handleConfirm = () => {
    if (dateRange) {
      onConfirm(dateRange);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const getViewTypeIcon = () => {
    switch (viewType) {
      case 'month':
        return <CalendarIcon className="h-5 w-5" />;
      case 'week':
        return <CalendarDays className="h-5 w-5" />;
      case 'day':
        return <Clock className="h-5 w-5" />;
      case 'block':
        return <CalendarIcon className="h-5 w-5" />;
      default:
        return <CalendarIcon className="h-5 w-5" />;
    }
  };

  const getViewTypeDescription = () => {
    switch (viewType) {
      case 'month':
        return t('doctorCalendar.dateRangeSelection.viewDescriptions.month');
      case 'week':
        return t('doctorCalendar.dateRangeSelection.viewDescriptions.week');
      case 'day':
        return t('doctorCalendar.dateRangeSelection.viewDescriptions.day');
      case 'block':
        return t('doctorCalendar.dateRangeSelection.viewDescriptions.block');
      default:
        return t('doctorCalendar.dateRangeSelection.viewDescriptions.default');
    }
  };

  const getViewTypeLabel = () =>
    t(`doctorCalendar.dateRangeSelection.viewTypes.${viewType}`, {
      defaultValue: CalendarService.getViewTypeLabel(viewType)
    });

  const getDateRangeSummary = () => {
    if (!dateRange) return null;

    const daysInRange = CalendarService.getDaysInRange(dateRange);
    const isSingleDay = isSameDay(dateRange.startDate, dateRange.endDate);

    return {
      totalDays: daysInRange.length,
      isSingleDay,
      startDateFormatted: format(dateRange.startDate, 'MMM dd, yyyy'),
      endDateFormatted: format(dateRange.endDate, 'MMM dd, yyyy'),
      rangeLabel: isSingleDay 
        ? format(dateRange.startDate, 'EEEE, MMMM d, yyyy')
        : `${format(dateRange.startDate, 'MMM dd')} - ${format(dateRange.endDate, 'MMM dd, yyyy')}`
    };
  };

  const summary = getDateRangeSummary();

  if (!dateRange || !summary) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getViewTypeIcon()}
            {title ?? t('doctorCalendar.dateRangeSelection.title')}
          </DialogTitle>
          <DialogDescription>
            {description ?? t('doctorCalendar.dateRangeSelection.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* View Type Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {getViewTypeIcon()}
              {getViewTypeLabel()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {getViewTypeDescription()}
            </span>
          </div>

          {/* Date Range Display */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t('doctorCalendar.dateRangeSelection.selectedRange')}
              </Label>
              <Badge variant="secondary">
                {t('doctorCalendar.dateRangeSelection.days', { count: summary.totalDays })}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">
                {summary.rangeLabel}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {summary.startDateFormatted}
                {!summary.isSingleDay && ` ${t('doctorCalendar.dateRangeSelection.to')} ${summary.endDateFormatted}`}
              </div>
            </div>
          </div>

          {/* Custom Date Range Selection for Block View */}
          {viewType === 'block' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('doctorCalendar.dateRangeSelection.customizeRange')}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('doctorCalendar.dateRangeSelection.startDate')}
                  </Label>
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    disabled={(date) => date > (customEndDate || new Date())}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('doctorCalendar.dateRangeSelection.endDate')}
                  </Label>
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    disabled={(date) => date < (customStartDate || new Date())}
                    className="rounded-md border"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Days Preview */}
          {!summary.isSingleDay && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('doctorCalendar.dateRangeSelection.daysIncluded')}
              </Label>
              <div className="bg-background border rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {CalendarService.getDaysInRange(dateRange).map((day, index) => (
                    <div
                      key={index}
                      className="p-1 text-center rounded bg-muted/50"
                      title={format(day, 'EEEE, MMMM d, yyyy')}
                    >
                      {format(day, 'dd')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            {t('doctorCalendar.dateRangeSelection.actions.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {t('doctorCalendar.dateRangeSelection.actions.confirmRange')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
