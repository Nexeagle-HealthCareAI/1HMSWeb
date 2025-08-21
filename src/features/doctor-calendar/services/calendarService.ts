import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfDay, 
  endOfDay,
  format,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  isWithinInterval,
  eachDayOfInterval
} from 'date-fns';

export type CalendarViewType = 'month' | 'week' | 'day' | 'block';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  startDateISO: string;
  endDateISO: string;
  displayLabel: string;
}

export interface CalendarSelection {
  viewType: CalendarViewType;
  selectedDate: Date;
  dateRange: DateRange;
  selectedDays?: Date[];
}

export class CalendarService {
  /**
   * Get date range based on view type and selected date
   */
  static getDateRange(viewType: CalendarViewType, selectedDate: Date): DateRange {
    let startDate: Date;
    let endDate: Date;
    let displayLabel: string;

    switch (viewType) {
      case 'month':
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
        displayLabel = format(selectedDate, 'MMMM yyyy');
        break;
      
      case 'week':
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        displayLabel = `Week of ${format(startDate, 'MMM dd, yyyy')}`;
        break;
      
      case 'day':
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        displayLabel = format(selectedDate, 'EEEE, MMMM d, yyyy');
        break;
      
      case 'block':
        // For block selection, we'll use the selected date as both start and end
        // This will be overridden when user selects a specific range
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        displayLabel = format(selectedDate, 'MMM dd, yyyy');
        break;
      
      default:
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
        displayLabel = format(selectedDate, 'MMMM yyyy');
    }

    return {
      startDate,
      endDate,
      startDateISO: format(startDate, "yyyy-MM-dd'T'00:00:00"),
      endDateISO: format(endDate, "yyyy-MM-dd'T'23:59:59"),
      displayLabel
    };
  }

  /**
   * Get date range for a custom block selection
   */
  static getBlockDateRange(startDate: Date, endDate: Date): DateRange {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
    
    return {
      startDate: start,
      endDate: end,
      startDateISO: format(start, "yyyy-MM-dd'T'00:00:00"),
      endDateISO: format(end, "yyyy-MM-dd'T'23:59:59"),
      displayLabel: `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
    };
  }

  /**
   * Get all days within a date range
   */
  static getDaysInRange(dateRange: DateRange): Date[] {
    return eachDayOfInterval({
      start: dateRange.startDate,
      end: dateRange.endDate
    });
  }

  /**
   * Check if a date is within a range
   */
  static isDateInRange(date: Date, dateRange: DateRange): boolean {
    return isWithinInterval(date, {
      start: dateRange.startDate,
      end: dateRange.endDate
    });
  }

  /**
   * Get next date range based on current view type
   */
  static getNextDateRange(currentRange: DateRange, viewType: CalendarViewType): DateRange {
    let nextDate: Date;

    switch (viewType) {
      case 'month':
        nextDate = addMonths(currentRange.startDate, 1);
        break;
      case 'week':
        nextDate = addWeeks(currentRange.startDate, 1);
        break;
      case 'day':
        nextDate = addDays(currentRange.startDate, 1);
        break;
      case 'block':
        // For block, move by the same duration as the current block
        const duration = currentRange.endDate.getTime() - currentRange.startDate.getTime();
        nextDate = new Date(currentRange.startDate.getTime() + duration);
        break;
      default:
        nextDate = addMonths(currentRange.startDate, 1);
    }

    return this.getDateRange(viewType, nextDate);
  }

  /**
   * Get previous date range based on current view type
   */
  static getPreviousDateRange(currentRange: DateRange, viewType: CalendarViewType): DateRange {
    let previousDate: Date;

    switch (viewType) {
      case 'month':
        previousDate = addMonths(currentRange.startDate, -1);
        break;
      case 'week':
        previousDate = addWeeks(currentRange.startDate, -1);
        break;
      case 'day':
        previousDate = addDays(currentRange.startDate, -1);
        break;
      case 'block':
        // For block, move by the same duration as the current block
        const duration = currentRange.endDate.getTime() - currentRange.startDate.getTime();
        previousDate = new Date(currentRange.startDate.getTime() - duration);
        break;
      default:
        previousDate = addMonths(currentRange.startDate, -1);
    }

    return this.getDateRange(viewType, previousDate);
  }

  /**
   * Convert FullCalendar view type to our view type
   */
  static convertFullCalendarView(fullCalendarView: string): CalendarViewType {
    switch (fullCalendarView) {
      case 'dayGridMonth':
        return 'month';
      case 'timeGridWeek':
        return 'week';
      case 'timeGridDay':
        return 'day';
      default:
        return 'month';
    }
  }

  /**
   * Convert our view type to FullCalendar view type
   */
  static convertToFullCalendarView(viewType: CalendarViewType): string {
    switch (viewType) {
      case 'month':
        return 'dayGridMonth';
      case 'week':
        return 'timeGridWeek';
      case 'day':
        return 'timeGridDay';
      default:
        return 'dayGridMonth';
    }
  }

  /**
   * Get human-readable view type label
   */
  static getViewTypeLabel(viewType: CalendarViewType): string {
    switch (viewType) {
      case 'month':
        return 'Month';
      case 'week':
        return 'Week';
      case 'day':
        return 'Day';
      case 'block':
        return 'Custom Range';
      default:
        return 'Month';
    }
  }

  /**
   * Format date range for display in popup
   */
  static formatDateRangeForPopup(dateRange: DateRange): string {
    const startFormatted = format(dateRange.startDate, 'MMM dd, yyyy');
    const endFormatted = format(dateRange.endDate, 'MMM dd, yyyy');
    
    if (isSameDay(dateRange.startDate, dateRange.endDate)) {
      return startFormatted;
    }
    
    return `${startFormatted} - ${endFormatted}`;
  }

  /**
   * Get time range for a specific day
   */
  static getTimeRangeForDay(date: Date, startTime: string = '00:00', endTime: string = '23:59'): DateRange {
    const startDate = new Date(date);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(date);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    endDate.setHours(endHour, endMinute, 59, 999);

    return {
      startDate,
      endDate,
      startDateISO: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
      endDateISO: format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
      displayLabel: `${format(startDate, 'MMM dd, yyyy')} ${startTime} - ${endTime}`
    };
  }
}
