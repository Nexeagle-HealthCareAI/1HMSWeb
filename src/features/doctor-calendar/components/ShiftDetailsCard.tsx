import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, AlertTriangle, CheckCircle, XCircle, Info, MousePointer, Eye, X } from 'lucide-react';
import { CalendarEvent, DoctorCalendarConfigResponse } from '../api/types';
import { useTranslation } from 'react-i18next';

interface ShiftDetailsCardProps {
  events?: CalendarEvent[];
  calendarConfig?: DoctorCalendarConfigResponse;
  isLoading?: boolean;
  isTimeOffWarningClosed?: boolean;
  onCloseTimeOffWarning?: () => void;
}

export const ShiftDetailsCard: React.FC<ShiftDetailsCardProps> = ({ 
  events = [], 
  calendarConfig, 
  isLoading = false,
  isTimeOffWarningClosed = false,
  onCloseTimeOffWarning
}) => {
  const { t } = useTranslation();
  
  // Extract unique shifts from events
  const uniqueShifts = React.useMemo(() => {
    const shifts = new Map<string, { count: number; color: string; times: string[] }>();
    
    events.forEach(event => {
      if (event.type === 'shift') {
        const shiftName = event.extendedProps?.shiftName || 'Unknown';
        const startTime = event.extendedProps?.startTime || '';
        const endTime = event.extendedProps?.endTime || '';
        const timeRange = `${startTime} - ${endTime}`;
        
        if (!shifts.has(shiftName)) {
          // Set proper colors for different shift types
          let shiftColor = '#6b7280'; // default gray
          
          if (shiftName === t('doctorCalendar.shifts.morning')) {
            shiftColor = '#10b981'; // green
          } else if (shiftName === t('doctorCalendar.shifts.afternoon')) {
            shiftColor = '#f59e0b'; // yellow
          } else if (shiftName === t('doctorCalendar.shifts.evening')) {
            shiftColor = '#f97316'; // orange
          } else {
            // Use event background color if available, otherwise use default
            shiftColor = event.backgroundColor || '#6b7280';
          }
          
          shifts.set(shiftName, {
            count: 0,
            color: shiftColor,
            times: []
          });
        }
        
        const shift = shifts.get(shiftName)!;
        shift.count++;
        if (!shift.times.includes(timeRange)) {
          shift.times.push(timeRange);
        }
      }
    });
    
    return Array.from(shifts.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      color: data.color,
      times: data.times
    }));
  }, [events]);

  // Check for time-off events
  const timeOffEvents = React.useMemo(() => {
    return events.filter(event => 
      event.type === 'timeoff' || 
      event.id?.startsWith('timeoff-') ||
      event.extendedProps?.type === 'timeoff'
    );
  }, [events]);

  // Check if there are time-off conflicts with shifts
  const hasTimeOffConflicts = React.useMemo(() => {
    if (timeOffEvents.length === 0) return false;
    
    // Check if any time-off events overlap with shift events
    return events.some(event => {
      if (event.type !== 'shift') return false;
      
      const shiftStart = new Date(event.start);
      const shiftEnd = new Date(event.end);
      
      return timeOffEvents.some(timeOffEvent => {
        const timeOffStart = new Date(timeOffEvent.start);
        const timeOffEnd = new Date(timeOffEvent.end);
        
        // Check for overlap - only consider it a conflict if the time-off completely overlaps or significantly overlaps with the shift
        const overlapStart = Math.max(shiftStart.getTime(), timeOffStart.getTime());
        const overlapEnd = Math.min(shiftEnd.getTime(), timeOffEnd.getTime());
        const overlapDuration = overlapEnd - overlapStart;
        const shiftDuration = shiftEnd.getTime() - shiftStart.getTime();
        
        // Only mark as conflict if overlap is more than 50% of the shift duration
        return overlapDuration > 0 && (overlapDuration / shiftDuration) > 0.5;
      });
    });
  }, [events, timeOffEvents]);

  const totalShifts = uniqueShifts.length;
  const totalEvents = events.length;

  return (
    <Card className="h-fit bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 lg:max-w-xs">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Info className="h-4 w-4 text-blue-600" />
          {t('doctorCalendar.shiftDetails.calendarGuide')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">


        {/* Time-Off Warning */}
        {timeOffEvents.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('doctorCalendar.shiftDetails.timeOffStatus')}
              </h4>
              <Badge variant="destructive" className="text-xs">
                {timeOffEvents.length} {t('doctorCalendar.shiftDetails.active')}
              </Badge>
            </div>
            
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <div className="text-xs text-orange-800 dark:text-orange-200 font-medium mb-1">
                {t('doctorCalendar.shiftDetails.timeOffPeriodsActive')}
              </div>
              <div className="text-xs text-orange-700 dark:text-orange-300">
                {t('doctorCalendar.shiftDetails.timeOffAffectsShifts')}
              </div>
            </div>
            
            <div className="space-y-1">
              {timeOffEvents.map((timeOffEvent, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1.5 p-1.5 rounded-md border border-red-200 dark:border-red-800"
                  style={{
                    backgroundColor: '#fef2f2'
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-red-700 dark:text-red-300 flex-1">
                    {timeOffEvent.title || t('doctorCalendar.shiftDetails.timeOff')}
                  </span>
                  <Badge 
                    variant="outline" 
                    className="text-xs px-1 py-0 border-red-300 text-red-600"
                  >
                    {timeOffEvent.allDay ? t('doctorCalendar.shiftDetails.allDay') : t('doctorCalendar.shiftDetails.partial')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Shifts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-900 dark:text-white">{t('doctorCalendar.shiftDetails.activeShifts')}</h4>
            <Badge variant="outline" className="text-xs">
              {totalShifts} {t('doctorCalendar.shiftDetails.types')}
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">Loading shifts...</div>
          ) : uniqueShifts.length > 0 ? (
            <div className="space-y-1">
              {uniqueShifts.map((shift, index) => {
                // Temporarily disable time-off conflict detection to fix red color issue
                const shiftHasTimeOffConflict = false;

                // Debug: log the shift color
                console.log(`Shift: ${shift.name}, Color: ${shift.color}, HasConflict: ${shiftHasTimeOffConflict}`);
                
                return (
                  <div 
                    key={index}
                    className={`flex items-center gap-1.5 p-1.5 rounded-md border ${
                      shiftHasTimeOffConflict ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                    style={{
                      backgroundColor: shiftHasTimeOffConflict ? '#fef2f2' : `${shift.color}15`,
                      borderColor: shiftHasTimeOffConflict ? '#fecaca' : `${shift.color}30`
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: shiftHasTimeOffConflict ? '#ef4444' : shift.color }}
                    ></div>
                    <span 
                      className={`text-xs font-medium flex-1 ${
                        shiftHasTimeOffConflict ? 'text-red-700 dark:text-red-300' : ''
                      }`}
                      style={!shiftHasTimeOffConflict ? { color: shift.color } : {}}
                    >
                      {shift.name}
                      {shiftHasTimeOffConflict && (
                        <span className="ml-1 text-red-500">(Time-off)</span>
                      )}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-1 py-0 ${
                        shiftHasTimeOffConflict ? 'border-red-300 text-red-600' : ''
                      }`}
                      style={!shiftHasTimeOffConflict ? {
                        backgroundColor: `${shift.color}20`,
                        borderColor: `${shift.color}40`,
                        color: shift.color
                      } : {}}
                    >
                      {shift.times[0] || 'Custom'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">No shifts scheduled</div>
          )}
        </div>



        {/* Quick Stats */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
          <h5 className="text-xs font-medium text-gray-900 dark:text-white mb-2">Quick Stats</h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Events:</span>
              <span className="font-medium">{totalEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Shift Types:</span>
              <span className="font-medium">{totalShifts}</span>
            </div>
            {timeOffEvents.length > 0 && (
              <div className="flex justify-between">
                <span className="text-red-600 dark:text-red-400">Time-Off Periods:</span>
                <span className="font-medium text-red-600 dark:text-red-400">{timeOffEvents.length}</span>
              </div>
            )}

          </div>
        </div>


      </CardContent>
    </Card>
  );
};
