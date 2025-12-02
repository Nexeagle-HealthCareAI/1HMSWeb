import React, { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTranslation } from 'react-i18next';
import { 
  CalendarHeader, 
  EditShiftModal, 
  PersonalizedScheduleModal,
  DeleteTimeOffDialog,
  CancelOverrideDialog,
  OverrideActionDialog,
  ShiftDetailsCard,
  AppointmentCancelDialog
} from './components';
import { useCalendarEvents, useCreateOverride, useDeleteOverride, useTimeOff, useCreateTimeOff, useDeleteTimeOff, useDoctorCalendarConfig, useAppointmentCancel } from './hooks/useCalendar';
import { useQueryClient } from '@tanstack/react-query';
import { calendarKeys } from './hooks/useCalendar';
import { CalendarEvent, CreateOverridePayload, CreateBlockPayload, ShiftName, CreateTimeOffRequest } from './api/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { useDoctorProfile } from '@/features/doctor/hooks/useDoctorProfile';

export const DoctorCalendarPage: React.FC = () => {
    const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridDay');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTimeOffWarningClosed, setIsTimeOffWarningClosed] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  
  // Modal states
  const [editShiftModal, setEditShiftModal] = useState({
    open: false,
    shiftDate: '',
    shiftName: t('doctorCalendar.shifts.morning') as ShiftName,
    initialData: undefined as any
  });
  


  const [personalizedScheduleModal, setPersonalizedScheduleModal] = useState({
    open: false,
    initialDate: undefined as string | undefined,
    initialStartDateTime: undefined as string | undefined,
    initialEndDateTime: undefined as string | undefined
  });

  const [deleteTimeOffModal, setDeleteTimeOffModal] = useState({
    open: false,
    timeOffData: undefined as {
      reason: string;
      fromDate: string;
      toDate: string;
      timeOffId: string;
    } | undefined
  });

  // Cancel override modal state
  const [cancelOverrideModal, setCancelOverrideModal] = useState({
    open: false,
    overrideData: undefined as {
      overrideId: string;
      shiftName: string;
      date: string;
      startTime: string;
      endTime: string;
    } | undefined
  });
  
  const [overrideActionModal, setOverrideActionModal] = useState({
    open: false,
    overrideData: undefined as {
      overrideId: string;
      shiftName: string;
      date: string;
      startTime: string;
      endTime: string;
    } | undefined
  });

  // Appointment cancellation modal state
  const [appointmentCancelModal, setAppointmentCancelModal] = useState({
    open: false,
    appointmentData: undefined as {
      appointmentId: string;
      patientName: string;
      patientPhone?: string;
      patientAge?: number;
      patientGender?: string;
      date: string;
      time: string;
      tokenNumber?: string;
    } | undefined
  });

  // Ref to store the setCancelOverrideModal function for event listeners
  const setCancelOverrideModalRef = useRef(setCancelOverrideModal);
  setCancelOverrideModalRef.current = setCancelOverrideModal;

  // Success dialog state
  const [successDialog, setSuccessDialog] = useState({
    open: false,
    title: '',
    message: '',
    details: [] as string[]
  });
  
  const { toast } = useToast();
  const { getUserId } = useAuthStore();
  const userId = getUserId() || '';
  
  // Direct doctor API call for lazy loading - independent of dashboard
  const { data: doctorProfile, isLoading: doctorProfileLoading, error: doctorProfileError } = useDoctorProfile(userId);
  
  // Log detailed error information and auth state
  React.useEffect(() => {
    if (doctorProfileError) {
      console.error('Doctor Profile Error Details:', {
        error: doctorProfileError,
        message: doctorProfileError.message,
        stack: doctorProfileError.stack,
        userId
      });
    }
  }, [doctorProfileError, userId]);
  const { data: userDetailsResponse } = useUserDetails(userId);

  const doctorId = doctorProfile?.doctorId;
  const authStore = useAuthStore();
  const hospitalId = authStore.getHospitalId();
  
  // Get doctor name - prioritize from doctor profile, fallback to user details
  const doctorName = userDetailsResponse?.userProfile?.fullName || userDetailsResponse?.mobileNumber || 'Doctor';
  
  // Get date range for API calls
  const getDateRange = useCallback(() => {
    switch (view) {
      case 'dayGridMonth':
        return {
          fromISO: format(startOfMonth(currentDate), "yyyy-MM-dd'T'00:00:00"),
          toISO: format(endOfMonth(currentDate), "yyyy-MM-dd'T'23:59:59")
        };
      case 'timeGridWeek':
        return {
          fromISO: format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00"),
          toISO: format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59")
        };
      case 'timeGridDay':
        return {
          fromISO: format(startOfDay(currentDate), "yyyy-MM-dd'T'00:00:00"),
          toISO: format(endOfDay(currentDate), "yyyy-MM-dd'T'23:59:59")
        };
      default:
        return {
          fromISO: format(startOfMonth(currentDate), "yyyy-MM-dd'T'00:00:00"),
          toISO: format(endOfMonth(currentDate), "yyyy-MM-dd'T'23:59:59")
        };
    }
  }, [currentDate, view]);
  
  const { fromISO, toISO } = getDateRange();
  
  // Calculate number of days based on view
  const getDaysCount = useCallback(() => {
    switch (view) {
      case 'dayGridMonth':
        // Calculate exact days in the current month
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return daysInMonth;
      case 'timeGridWeek':
        return 7; // 7 days in a week
      case 'timeGridDay':
        return 1; // 1 day
      default:
        // Calculate exact days in the current month for default case
        const defaultYear = currentDate.getFullYear();
        const defaultMonth = currentDate.getMonth();
        const defaultDaysInMonth = new Date(defaultYear, defaultMonth + 1, 0).getDate();
        return defaultDaysInMonth;
    }
  }, [view, currentDate]);
  
  const daysCount = getDaysCount();
  
  // Queries - Use the same startDate for both hooks to ensure consistency
  const { data: calendarConfig, isLoading: configLoading, refetch: refetchCalendarConfig } = useDoctorCalendarConfig(doctorId,hospitalId, fromISO, daysCount);
  const { data: events = [], isLoading: eventsLoading, refetch: refetchCalendarEvents } = useCalendarEvents(doctorId, hospitalId, fromISO, toISO, calendarConfig);
  const { data: timeOffData, isLoading: timeOffLoading } = useTimeOff(doctorId,hospitalId);
  
  // Use real events directly
  const allEvents = events;
  const clickToManageHint = t('doctorCalendar.clickToManage', 'Tap to manage override');
  const overrideBadgeLabel = t('doctorCalendar.overrideBadge', 'Override');

  const dynamicScrollTime = React.useMemo(() => {
    if (view !== 'timeGridDay') return '06:00:00';
    const now = new Date();
    const earliestHour = 6;
    if (now.getHours() < earliestHour) {
      return '06:00:00';
    }
    return format(now, "HH:mm:ss");
  }, [view]);

  
  // Debug time-off data
  React.useEffect(() => {
    console.log('🔍 Time-off data from API:', {
      timeOffData,
      timeOffLoading,
      doctorId
    });
  }, [timeOffData, timeOffLoading, doctorId]);
  


  // Debug time-off events specifically
  const timeOffEvents = events.filter(event => event.type === 'timeoff' || event.id?.startsWith('timeoff-'));
  console.log('🔍 Time-off events in current view:', {
    totalEvents: events.length,
    timeOffEvents: timeOffEvents.length,
    timeOffEventDetails: timeOffEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      type: event.type,
      extendedProps: event.extendedProps
    }))
  });
  





  
  // Mutations
  const createOverrideMutation = useCreateOverride();
  const deleteOverrideMutation = useDeleteOverride();
  // Removed mock block mutations
  const createTimeOffMutation = useCreateTimeOff();
  const deleteTimeOffMutation = useDeleteTimeOff();
  const { cancelAppointment, isPending: isCancelPending } = useAppointmentCancel();
  

  
  // Handle view changes
  React.useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        calendarApi.changeView(view);
        

      }
    }
  }, [view]);

  // Handle date changes
  React.useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        calendarApi.gotoDate(currentDate);
      }
    }
  }, [currentDate]);

  // Initial loading delay to ensure all API calls complete
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
      

    }, 1000); // Reduced to 1 second for better UX

    return () => clearTimeout(timer);
  }, [view]);




  
  // Calendar event handlers
  const openTimeOffDeleteModal = useCallback((event: any, fallbackReason?: string) => {
    const toIsoString = (date?: Date | null) => {
      if (!date) return undefined;
      try {
        return date.toISOString();
      } catch (error) {
        console.warn('Invalid date when preparing time-off modal', { date, eventId: event?.id, error });
        return undefined;
      }
    };

    const normalizeId = (value?: string | number | null) => {
      if (value === undefined || value === null) return undefined;
      const stringValue = String(value);
      return stringValue.startsWith('timeoff-') ? stringValue.replace('timeoff-', '') : stringValue;
    };

    const possibleTimeOffIds = [
      event.extendedProps?.timeOffId,
      event.extendedProps?.sourceId,
      event.extendedProps?.blockId,
      event.extendedProps?.id,
      event.id
    ];

    const timeOffId = possibleTimeOffIds
      .map(normalizeId)
      .find(Boolean);

    const reason = fallbackReason || event.extendedProps?.reason || event.title || t('doctorCalendar.timeOff');

    const resolvedFromDate =
      event.extendedProps?.fromDate ||
      event.extendedProps?.startDate ||
      toIsoString(event.start) ||
      event.startStr ||
      event.extendedProps?.start ||
      toIsoString(event._instance?.range?.start);

    const resolvedToDate =
      event.extendedProps?.toDate ||
      event.extendedProps?.endDate ||
      toIsoString(event.end) ||
      event.endStr ||
      event.extendedProps?.end ||
      toIsoString(event._instance?.range?.end) ||
      resolvedFromDate; // fallback to start if end missing

    if (timeOffId && resolvedFromDate && resolvedToDate) {
      setDeleteTimeOffModal({
        open: true,
        timeOffData: {
          timeOffId,
          reason,
          fromDate: resolvedFromDate,
          toDate: resolvedToDate
        }
      });
      return true;
    }

    console.warn('Unable to open time-off delete modal: missing data', {
      eventId: event.id,
      timeOffId,
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
      event
    });
    toast({
      title: t('doctorCalendar.error'),
      description: t('doctorCalendar.failedToDeleteTimeOff'),
      variant: 'destructive'
    });
    return false;
  }, [t, toast, setDeleteTimeOffModal]);

  const handleEventClick = useCallback((info: any) => {
    const event = info.event;
    const eventType = event.extendedProps?.type;
    const shiftName = event.extendedProps?.shiftName;
    const isTimeOffEvent =
      eventType === 'timeoff' ||
      event.id?.startsWith('timeoff-') ||
      event.extendedProps?.isTimeOff ||
      event.extendedProps?.source === 'timeoff';
    
   
    
    // Handle time-off events
    if (isTimeOffEvent) {
      openTimeOffDeleteModal(event);
      return; // Stop processing for time-off events
    }
    

    
    // OVERRIDE EVENT HANDLING: Show action dialog for any click on override events
    if ((eventType === 'shift' || eventType === 'block') && event.extendedProps?.source === 'override') {
      const target = info.jsEvent?.target;
      const isCancelButtonClick = target && (
        target.classList?.contains('cancel-override-btn') || 
        target.closest('.cancel-override-btn') ||
        target.closest('button[data-override-id]')
      );
      
      // Get override data from the event - updated for new API response format
      const overrideId = event.extendedProps?.overrideId;
      const shiftName = event.extendedProps?.shiftName;
      const shiftDate = event.start ? format(event.start, 'yyyy-MM-dd') : '';
      const startTime = event.extendedProps?.startTime || '09:00';
      const endTime = event.extendedProps?.endTime || '12:00';
      
      console.log('Override event clicked:', { overrideId, shiftName, shiftDate, isCancelButtonClick });
      
      if (overrideId && shiftName && shiftDate) {
        // Show the action dialog with both cancel and update options
        setOverrideActionModal({
          open: true,
          overrideData: {
            overrideId,
            shiftName,
            date: shiftDate,
            startTime,
            endTime
          }
        });
      } else {
        console.warn('Missing data for override action:', { overrideId, shiftName, shiftDate });
      }
      return; // Always return for override events
    }
    
    // Check if the click was on a cancel button
    const target = info.jsEvent?.target;
    
    // Check for cancel time-off button click
    if (target && target.classList?.contains('cancel-timeoff-btn')) {
      const reason = target.getAttribute('data-reason');
      openTimeOffDeleteModal(event, reason || event.title || undefined);
      return; // Stop processing the regular event click
    }
    
    if (eventType === 'shift' || (eventType === 'block' && event.extendedProps?.isShiftBlock)) {
      // Open EditShiftModal for regular shift events and shift blocks
      // Note: Override events are already handled at the beginning of this function
      if (!event.start) {
        toast({
          title: t('doctorCalendar.error'),
          description: t('doctorCalendar.invalidEventDate'),
          variant: "destructive",
        });
        return;
      }
      
      const shiftDate = format(event.start, 'yyyy-MM-dd');
      const shiftName = event.extendedProps?.shiftName as ShiftName;
      
      setEditShiftModal({
        open: true,
        shiftDate,
        shiftName,
        initialData: {
          startTime: event.extendedProps?.startTime || '09:00',
          endTime: event.extendedProps?.endTime || '12:00',
          slotMinutes: event.extendedProps?.slotMinutes || 15,
          maxPatients: event.extendedProps?.maxPatients || null,
          reason: event.extendedProps?.reason || null
        }
      });
    } else if (eventType === 'appointment') {
      // Show appointment cancellation dialog
      const appointmentId = event.extendedProps?.appointmentId || event.id;
      const patientName = event.extendedProps?.patientName || event.title;
      const patientPhone = event.extendedProps?.patientPhone;
      const patientAge = event.extendedProps?.patientAge;
      const patientGender = event.extendedProps?.patientGender;
      const tokenNumber = event.extendedProps?.tokenNumber;
      const appointmentDate = event.start ? format(event.start, 'yyyy-MM-dd') : '';
      const appointmentTime = event.extendedProps?.time || event.start ? format(event.start, 'HH:mm') : '';
      
      if (appointmentId && patientName && appointmentDate && appointmentTime) {
        setAppointmentCancelModal({
          open: true,
          appointmentData: {
            appointmentId,
            patientName,
            patientPhone,
            patientAge,
            patientGender,
            date: appointmentDate,
            time: appointmentTime,
            tokenNumber
          }
        });
      } else {
        toast({
          title: "Appointment Details",
          description: `Patient: ${patientName}, Token: ${tokenNumber}`,
        });
      }
         } else if (eventType === 'block') {
       // Handle time-off blocks
       const isTimeOff = event.extendedProps?.isTimeOff;
       if (isTimeOff) {
         // Open delete dialog for time-off events
          openTimeOffDeleteModal(event);
       } else {
         toast({
           title: "Block Details",
           description: `${event.title}`,
         });
       }
     }
    }, [toast, openTimeOffDeleteModal]);
  
     const handleDateSelect = useCallback((selectInfo: any) => {
     
     // Check if the selection is on an override event
     const selectedStart = selectInfo.start;
     const selectedEnd = selectInfo.end;
     
     // Check if there are any override events in the selected range
     const hasOverrideInRange = events.some(event => {
       if (event.extendedProps?.isOverride) {
         const eventStart = new Date(event.start);
         const eventEnd = new Date(event.end);
         
         // Check for overlap with override events
         return eventStart < selectedEnd && eventEnd > selectedStart;
       }
       return false;
     });
     
     // Check if there are any shift blocks in the selected range
     const hasShiftBlockInRange = events.some(event => {
       if (event.extendedProps?.isShiftBlock) {
         const eventStart = new Date(event.start);
         const eventEnd = new Date(event.end);
         
         // Check for overlap with shift blocks
         return eventStart < selectedEnd && eventEnd > selectedStart;
       }
       return false;
     });
     
     if (hasOverrideInRange) {
       console.log('Date selection blocked - override event in range');
       return; // Don't open any modal if override events are in the selection
     }
     
     if (hasShiftBlockInRange) {
       console.log('Date selection blocked - shift block in range');
       toast({
         title: t('doctorCalendar.shiftBlock'),
         description: t('doctorCalendar.shiftBlockMessage'),
         variant: "destructive",
       });
       return; // Don't open any modal if shift blocks are in the selection
     }
     
     // Check if there's already a time-off in the selected area
     const hasTimeOffConflict = events.some(event => {
       if (event.extendedProps?.isTimeOff) {
         const eventStart = new Date(event.start);
         const eventEnd = new Date(event.end);
         
         // Check for overlap
         return eventStart < selectedEnd && eventEnd > selectedStart;
       }
       return false;
     });
     
     if (hasTimeOffConflict) {
       toast({
         title: t('doctorCalendar.timeOffConflict'),
         description: t('doctorCalendar.timeOffConflictMessage'),
         variant: "destructive",
       });
       return;
     }
     
     // Open PersonalizedScheduleModal with time off functionality for date selection
     safeSetPersonalizedScheduleModal({
       open: true,
       initialDate: undefined,
       initialStartDateTime: selectInfo.start.toISOString(),
       initialEndDateTime: selectInfo.end.toISOString()
     });
   }, [events, toast]);
  
  const handleEventDrop = useCallback((dropInfo: any) => {
    // Handle event drag and drop
    toast({
      title: t('doctorCalendar.eventMoved'),
      description: `${dropInfo.event.title} moved to ${format(dropInfo.event.start!, 'MMM dd, yyyy')}`,
    });
  }, [toast]);
  
  const handleEventResize = useCallback((resizeInfo: any) => {
    // Handle event resize
    toast({
      title: t('doctorCalendar.eventResized'),
      description: `${resizeInfo.event.title} resized`,
    });
  }, [toast]);
  
       // Override events are now clickable and handled by the main eventClick handler
  // No global event prevention needed
  
     // Calendar configuration
   const calendarOptions = {
     plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
     initialView: view,
     initialDate: currentDate,
     headerToolbar: false as const, // We're using our custom header
     height: 'auto', // Let content determine height
     contentHeight: 'auto', // Disable internal height constraints
     selectable: true,
     selectMirror: true,
     dayMaxEvents: true,
     weekends: true,
     firstDay: 1, // Monday
     timezone: 'local',
         slotDuration: '00:15:00',
     slotMinTime: '06:00:00',
   scrollTime: dynamicScrollTime,

     selectOverlap: (event: any) => {
       // Don't allow selection to overlap with override events
       if (event && event.extendedProps?.isOverride) {
         return false;
       }
       // Don't allow selection to overlap with shift blocks
       if (event && event.extendedProps?.isShiftBlock) {
         return false;
       }
       return true;
     },
           eventOrder: 'blocks,appointments,shifts',
      eventDisplay: 'block', // Ensure events are displayed as blocks
      eventBackgroundColor: '#3b82f6', // Default background for events
      eventOverlap: false, // Prevent events from overlapping
     events: events,
     eventClick: handleEventClick,
     select: handleDateSelect,
     eventDrop: handleEventDrop,
     eventResize: handleEventResize,
     eventDidMount: (info: any) => {
       // Debug logging for event mounting
       const eventType = info.event.extendedProps?.type;
       const isTimeOff = info.event.extendedProps?.isTimeOff;
       const isOverride = info.event.extendedProps?.isOverride;
       
       console.log('📅 Event mounted:', {
         id: info.event.id,
         title: info.event.title,
         type: eventType,
         isTimeOff,
         isOverride,
         start: info.event.start,
         end: info.event.end,
         backgroundColor: info.event.backgroundColor,
         element: info.el
       });
       
       if (eventType === 'timeoff' || eventType === 'block' || isTimeOff) {
         console.log('🎯 TimeOff/Block event mounted:', {
           id: info.event.id,
           title: info.event.title,
           type: eventType,
           isTimeOff,
           start: info.event.start,
           end: info.event.end,
           element: info.el,
           elementClasses: info.el.className
         });
       }
       
       // Add data-override attribute for override shifts
       if (info.event.extendedProps?.isOverride) {
         info.el.setAttribute('data-override', 'true');
         console.log('📅 Set data-override attribute for event:', info.event.id);
       }
       
       // Add data-event-type attribute for better CSS targeting
       if (eventType) {
         info.el.setAttribute('data-event-type', eventType);
       }
       
                         // Override events are now handled by the main eventClick handler
         // No additional event listeners needed
     },
    eventContent: (arg: any) => {
      const eventType = arg.event.extendedProps?.type;
      
      if (eventType === 'shift') {
        const isOverride = arg.event.extendedProps?.isOverride;
        
        if (isOverride) {
          // Override shifts - show only essential info
          return {
            html: `
              <div class="fc-event-main-content override-event-content">
                <div class="flex flex-col gap-0.5">
                  <span class="text-[10px] uppercase tracking-[0.16em] text-white/80">${overrideBadgeLabel}</span>
                  <span class="text-xs font-semibold leading-tight">${arg.event.title}</span>
                  <span class="text-[10px] text-white/80">${clickToManageHint}</span>
                </div>
              </div>
            `
          };
        } else {
          // Regular shift events - show only essential info
          return {
            html: `
              <div class="fc-event-main-content">
                <div class="text-xs font-bold">${arg.event.title}</div>
              </div>
            `
          };
        }
      } else if (eventType === 'appointment') {
        return {
          html: `
            <div class="fc-event-main-content">
              <div class="text-xs font-bold">${arg.event.extendedProps?.tokenNumber || '#'}</div>
            </div>
          `
        };
      } else if (eventType === 'timeoff') {
        // Time-off events - show only essential info
        return {
          html: `
            <div class="fc-event-main-content timeoff-event-content">
              <div class="text-xs font-bold">${arg.event.title}</div>
            </div>
          `
        };
      } else if (eventType === 'block') {
        const isTimeOff = arg.event.extendedProps?.isTimeOff;
        
        if (isTimeOff) {
          // Time-off events - show only essential info
          return {
            html: `
              <div class="fc-event-main-content timeoff-event-content">
                <div class="text-xs font-bold">${arg.event.title}</div>
              </div>
            `
          };
        } else if (arg.event.extendedProps?.isShiftBlock) {
          // Shift block events - show only essential info
          return {
            html: `
              <div class="fc-event-main-content">
                <div class="text-xs font-bold">${arg.event.title}</div>
              </div>
            `
          };
        } else {
          // Regular block events - show only essential info
          return {
            html: `
              <div class="fc-event-main-content">
                <div class="text-xs font-bold">${arg.event.title}</div>
              </div>
            `
          };
        }
      }
      
      return {
        html: `
          <div class="fc-event-main-content">
            <div class="text-xs font-bold">${arg.event.title}</div>
          </div>
        `
      };
    },
                   eventClassNames: (arg: any) => {
        const eventType = arg.event.extendedProps?.type;
        const shiftName = arg.event.extendedProps?.shiftName;
        const isTimeOff = arg.event.extendedProps?.isTimeOff;
        const isWorkingShift = arg.event.extendedProps?.isWorkingShift;
        const isBackground = arg.event.display === 'background';
        
        const classes = [];
        
        if (eventType === 'shift') {
          if (isBackground && isWorkingShift) {
            // Background shift events
            classes.push('shift-background');
          } else {
            // Regular shift events
            classes.push('shift-event');
                    if (shiftName === t('doctorCalendar.shifts.morning')) classes.push('shift-morning');
        else if (shiftName === t('doctorCalendar.shifts.afternoon')) classes.push('shift-afternoon');
        else if (shiftName === t('doctorCalendar.shifts.evening')) classes.push('shift-evening');
        
          }
        } else if (eventType === 'block') {
          if (isTimeOff) {
            // Time-off events
            classes.push('block-event', 'api-timeoff-event');
          } else if (arg.event.extendedProps?.isShiftBlock) {
            // Shift block events
            classes.push('block-event', 'shift-block-event');
          } else {
            // Regular block events
            classes.push('block-event', 'timeoff-event');
          }
          
          // Ensure block events are always visible
          classes.push('block-event-visible');
        } else if (eventType === 'appointment') {
          classes.push('appointment-event');
        }
        
        return classes;
      }
  };
  
  // Action handlers
  const handleAddOverride = () => {
    // Open PersonalizedScheduleModal
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Check if there's already a time-off today
      const todayStart = new Date(today);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const hasTimeOffToday = events.some(event => {
        if (event.extendedProps?.isTimeOff) {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          
          // Check if event overlaps with today
          return eventStart <= todayEnd && eventEnd >= todayStart;
        }
        return false;
      });
      
      if (hasTimeOffToday) {
        toast({
          title: "Time Off Conflict",
          description: "You already have time-off scheduled for today. Please cancel existing time-off first or select a different date.",
          variant: "destructive",
        });
        return;
      }
      
      setPersonalizedScheduleModal({
        open: true,
        initialDate: today,
        initialStartDateTime: undefined,
        initialEndDateTime: undefined
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open personalized schedule modal",
        variant: "destructive",
      });
    }
  };
  
  // Override the setPersonalizedScheduleModal to prevent opening when override events are clicked
  const safeSetPersonalizedScheduleModal = React.useCallback((modalState: any) => {
    // Check if this is being called from an override event click
    const activeElement = document.activeElement;
    const overrideEvent = activeElement?.closest('.fc-event[data-override="true"]');
    
    if (overrideEvent) {
      console.log('Preventing PersonalizedScheduleModal from opening - override event clicked');
      return; // Don't open the modal
    }
    
    setPersonalizedScheduleModal(modalState);
  }, []);
  

  
  // Modal handlers
  const refreshCalendarData = React.useCallback(async () => {
    await Promise.allSettled([
      refetchCalendarConfig(),
      refetchCalendarEvents()
    ]);
  }, [refetchCalendarConfig, refetchCalendarEvents]);

  const handleSaveOverride = (payload: CreateOverridePayload) => {
    // Ensure hospitalId is present in payload
    const finalPayload: CreateOverridePayload = {
      ...payload,
      hospitalId: hospitalId || payload.hospitalId,
    };
    createOverrideMutation.mutate(finalPayload, {
      onSuccess: async (data) => {
    toast({
          title: "Success",
          description: data.message || "Shift override created successfully",
    });
    setEditShiftModal(prev => ({ ...prev, open: false }));
        // Refresh calendar data without reloading the entire page
        await refreshCalendarData();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to create shift override",
          variant: "destructive",
        });
      }
    });
  };

  const handleSavePersonalizedSchedule = (payloads: CreateOverridePayload[]) => {
    // Process each payload sequentially
    const processPayloads = async () => {
      let successCount = 0;
      let errorCount = 0;
      
      for (const payload of payloads) {
        try {
          const finalPayload: CreateOverridePayload = {
            ...payload,
            hospitalId: hospitalId || payload.hospitalId,
          };
          await createOverrideMutation.mutateAsync(finalPayload);
          successCount++;
        } catch (error) {
          console.error('Error creating override:', error);
          errorCount++;
        }
      }
      
      // Show appropriate success dialog
      if (successCount > 0 && errorCount === 0) {
        setSuccessDialog({
          open: true,
          title: t('doctorCalendar.scheduleSaved'),
          message: t('doctorCalendar.scheduleSavedMessage'),
          details: [
            `✅ ${successCount} ${t('doctorCalendar.overridesCreated')}${successCount > 1 ? 's' : ''}`,
            `📅 ${t('doctorCalendar.changesReflected')}`,
            `👥 ${t('doctorCalendar.patientsCanBook')}`
          ]
        });
      } else if (successCount > 0 && errorCount > 0) {
        setSuccessDialog({
          open: true,
          title: t('doctorCalendar.partiallySaved'),
          message: t('doctorCalendar.partiallySavedMessage'),
          details: [
            `✅ ${successCount} ${t('doctorCalendar.overridesSaved')}`,
            `❌ ${errorCount} ${t('doctorCalendar.overridesFailed')}`,
            `🔄 ${t('doctorCalendar.tryAgainFailed')}`
          ]
        });
      } else {
        // Keep toast for error cases
        toast({
          title: t('doctorCalendar.error'),
          description: t('doctorCalendar.failedToCreateOverrides'),
          variant: "destructive",
        });
      }
      
      setPersonalizedScheduleModal(prev => ({ ...prev, open: false }));
        await refreshCalendarData();
      // TODO: Refetch calendar events here if needed
    };
    
    processPayloads();
  };
  const handleSaveBlockFromPersonalized = (payload: CreateBlockPayload) => {
    if (!hospitalId) {
      toast({
        title: t('doctorCalendar.error'),
        description: 'Hospital context is missing. Please refresh and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    // Convert CreateBlockPayload to CreateTimeOffRequest
    // Format dates to YYYY-MM-DD format for the API
    const fromDate = new Date(payload.startDateTime);
    const toDate = new Date(payload.endDateTime);
    
    const timeOffRequest: CreateTimeOffRequest = {
      doctorId: payload.doctorId,
      hospitalId,
      fromDate: format(fromDate, 'yyyy-MM-dd'),
      toDate: format(toDate, 'yyyy-MM-dd'),
      reason: payload.title
    };
    
    createTimeOffMutation.mutate(timeOffRequest, {
      onSuccess: async (data) => {
        setSuccessDialog({
          open: true,
          title: t('doctorCalendar.timeOffScheduled'),
          message: t('doctorCalendar.timeOffScheduledMessage'),
          details: [
            `✅ ${t('doctorCalendar.timeOffBlocked')}`,
            `📅 ${t('doctorCalendar.duration')}: ${format(fromDate, 'MMM dd, yyyy HH:mm')} - ${format(toDate, 'MMM dd, yyyy HH:mm')}`,
            `🚫 ${t('doctorCalendar.noAppointmentsBooked')}`,
            `📱 ${t('doctorCalendar.cancelTimeOffAnytime')}`
          ]
        });
        setPersonalizedScheduleModal(prev => ({ ...prev, open: false }));
          await refreshCalendarData();
        // TODO: Refetch calendar events here if needed
      },
      onError: (error) => {
        toast({
          title: t('doctorCalendar.error'),
          description: t('doctorCalendar.failedToScheduleTimeOff'),
          variant: 'destructive',
        });
      }
    });
  };
  
  const handleDeleteOverride = () => {
    // TODO: Implement when override API is available
    toast({
      title: t('doctorCalendar.info'),
      description: t('doctorCalendar.deleteOverrideNotImplemented'),
    });
    setEditShiftModal(prev => ({ ...prev, open: false }));
  };

  const handleDeleteTimeOff = () => {
    if (!deleteTimeOffModal.timeOffData?.timeOffId) return;
    if (!doctorId || !hospitalId) {
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.hospitalContextMissing', 'Hospital context is missing. Please refresh and try again.'),
        variant: 'destructive'
      });
      return;
    }
    
    deleteTimeOffMutation.mutate({
      doctorId,
      hospitalId,
      timeOffId: deleteTimeOffModal.timeOffData.timeOffId
    }, {
      onSuccess: (data) => {
        toast({
          title: t('doctorCalendar.success'),
          description: data.message || t('doctorCalendar.timeOffDeleted'),
        });
        setDeleteTimeOffModal({ open: false, timeOffData: undefined });
          refetchCalendarEvents();
        
        // TODO: Refetch calendar events here if needed
      },
      onError: (error) => {
        toast({
          title: t('doctorCalendar.error'),
          description: t('doctorCalendar.failedToDeleteTimeOff'),
          variant: "destructive",
        });
      }
    });
  };

  const handleCancelOverride = () => {
    const overrideData = cancelOverrideModal.overrideData;
    
    if (!overrideData?.overrideId) {
      console.error('No override data available for cancellation');
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.noOverrideData'),
        variant: "destructive",
      });
      return;
    }
    
    console.log('Canceling override with data:', overrideData);
    
    deleteOverrideMutation.mutate(overrideData.overrideId, {
      onSuccess: async (data) => {
        console.log('Override canceled successfully:', data);
        toast({
          title: t('doctorCalendar.success'),
          description: data.message || t('doctorCalendar.shiftOverrideCanceled'),
        });
        setCancelOverrideModal({ open: false, overrideData: undefined });
          await refreshCalendarData();
        
        // TODO: Refetch calendar events here if needed
      },
      onError: (error) => {
        console.error('Failed to cancel override:', error);
        toast({
          title: t('doctorCalendar.error'),
          description: t('doctorCalendar.failedToCancelOverride'),
          variant: "destructive",
        });
      }
    });
  };
  
  const handleOverrideActionCancel = () => {
    const overrideData = overrideActionModal.overrideData;
    
    if (!overrideData?.overrideId) {
      console.error('No override data available for cancellation');
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.noOverrideData'),
        variant: "destructive",
      });
      return;
    }
    
    console.log('Launching cancel confirmation for override:', overrideData);

    // Close the action dialog and open the dedicated cancel confirmation dialog
    setOverrideActionModal({ open: false, overrideData: undefined });
    setCancelOverrideModal({ open: true, overrideData });
  };
  
  const handleOverrideActionUpdate = () => {
    const overrideData = overrideActionModal.overrideData;
    
    if (!overrideData) {
      console.error('No override data available for update');
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.noOverrideData'),
        variant: "destructive",
      });
      return;
    }
    
    console.log('Opening edit modal for override:', overrideData);
    
    // Close the action dialog
    setOverrideActionModal({ open: false, overrideData: undefined });
    
    // Open the edit shift modal with the override data
    setEditShiftModal({
      open: true,
      shiftDate: overrideData.date,
      shiftName: overrideData.shiftName as ShiftName,
      initialData: {
        startTime: overrideData.startTime,
        endTime: overrideData.endTime,
        slotMinutes: 15, // Default value
        maxPatients: null,
        reason: null
      }
    });
  };
  
  const handleCancelAppointment = async () => {
    if (!appointmentCancelModal.appointmentData?.appointmentId) {
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.noAppointmentData'),
        variant: "destructive",
      });
      return;
    }
    
    const success = await cancelAppointment(appointmentCancelModal.appointmentData.appointmentId);
    
    if (success) {
      setAppointmentCancelModal({ open: false, appointmentData: undefined });
        refetchCalendarEvents();
      // TODO: Refetch calendar events here if needed
    }
  };


  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('doctorCalendar.userIdRequired')}
          </h3>
          <p className="text-gray-600">
            {t('doctorCalendar.userIdRequiredMessage')}
          </p>
        </div>
      </div>
    );
  }

  if (!doctorId || doctorProfileLoading || isInitialLoading || configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {isInitialLoading ? t('doctorCalendar.initializingCalendar') : doctorProfileLoading ? t('doctorCalendar.loadingDoctorProfile') : configLoading ? t('doctorCalendar.loadingCalendarConfig') : t('doctorCalendar.doctorProfileRequired')}
          </h3>
          <p className="text-gray-600">
            {isInitialLoading ? t('doctorCalendar.initializingMessage') : doctorProfileLoading ? t('doctorCalendar.loadingProfileMessage') : configLoading ? t('doctorCalendar.loadingConfigMessage') : t('doctorCalendar.profileLoadError')}
          </p>
          {doctorProfileError && (
            <div className="text-red-600 text-sm mt-2">
                              <p className="font-medium">{t('errors.doctorProfileError')}:</p>
              <p>{doctorProfileError.message || 'Failed to load doctor profile'}</p>
              <button 
                onClick={() => {/* TODO: Refetch doctor profile or calendar data here if needed */}} 
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                {t('doctorCalendar.retry')}
              </button>
            </div>
          )}
          {(isInitialLoading || doctorProfileLoading || configLoading) && (
            <div className="mt-4">
              <LoadingSpinner size="lg" />
            </div>
          )}
        </div>
      </div>
    );
  }
  
             return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 -m-6 transition-all duration-300">
                {/* Sticky Header within Main Layout */}
                <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm">
          <CalendarHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            view={view}
            onViewChange={setView}
            onAddOverride={handleAddOverride}
          />
          

        </div>
         

         
        {/* Main Content Area with Calendar and Shift Details */}
        <div className="flex-1 px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Calendar Column with Scroll */}
            <div className="lg:col-span-3 overflow-y-auto">
              {eventsLoading || doctorProfileLoading || isInitialLoading || configLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <LoadingSpinner size="lg" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                      {isInitialLoading ? t('doctorCalendar.preparingCalendar') : 
                       doctorProfileLoading ? t('doctorCalendar.loadingProfile') : 
                       configLoading ? t('doctorCalendar.loadingScheduleConfig') : t('doctorCalendar.loading')}
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      {isInitialLoading ? t('doctorCalendar.preparingMessage') : 
                       doctorProfileLoading ? t('doctorCalendar.fetchingProfileMessage') : 
                       configLoading ? t('doctorCalendar.loadingScheduleMessage') : t('doctorCalendar.pleaseWait')}
                    </p>
                    {doctorProfileError && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-700 dark:text-red-400 font-medium">{t('errors.doctorProfileError')}</p>
                        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{doctorProfileError.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div 
                  className="calendar-container"
                >
                  <div className="relative rounded-[30px] bg-gradient-to-br from-white/70 via-slate-50/80 to-blue-50/80 dark:from-slate-900/50 dark:via-slate-900/60 dark:to-slate-900/70 p-[1px] shadow-2xl border border-white/50 dark:border-slate-800/70">
                    <div className="rounded-[28px] bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl overflow-hidden">
                      <FullCalendar
                        key={`${view}-${currentDate.toISOString()}`}
                        ref={calendarRef}
                        {...calendarOptions}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shift Details Card Column - Fixed Height */}
            <div className="lg:col-span-1">
              <div className="h-fit">
                <ShiftDetailsCard 
                  events={allEvents}
                  calendarConfig={calendarConfig}
                  isLoading={eventsLoading || configLoading}
                  isTimeOffWarningClosed={isTimeOffWarningClosed}
                  onCloseTimeOffWarning={() => setIsTimeOffWarningClosed(true)}
                  currentDate={currentDate}
                  currentView={view as 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'}
                />
              </div>
            </div>
          </div>
        </div>
      
        {/* Enhanced CSS for modern calendar styling */}
                <style>{`
          /* Smooth scrolling for the calendar content */
          .calendar-container {
            scroll-behavior: smooth;
          }
          
          /* Calendar Container Enhancements */
          .calendar-container {
            transition: all 0.3s ease;
          }
          
          /* Responsive grid adjustments */
          @media (max-width: 1024px) {
            .lg\\:grid-cols-4 {
              grid-template-columns: 1fr;
            }
            .lg\\:col-span-3 {
              grid-column: span 1;
            }
            .lg\\:col-span-1 {
              grid-column: span 1;
            }
          }
          
          /* Calendar column height and scroll */
          .lg\\:col-span-3 {
            max-height: calc(100vh - 200px);
            overflow-y: auto;
          }
          
          .calendar-container:hover {
            transform: translateY(-2px);
          }
          
          /* Single scrollable container - disable FullCalendar's internal scrolling */
          .fc {
            height: auto !important;
            overflow: visible !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          }
          
          .fc-view-harness {
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Disable FullCalendar's internal scrolling */
          .fc-timegrid-body {
            overflow: visible !important;
            max-height: none !important;
          }
          
          .fc-daygrid-body {
            overflow: visible !important;
          }
          
          .fc-scroller {
            overflow: visible !important;
          }
          
          .fc-scroller-liquid {
            overflow: visible !important;
          }
          
          /* Enhanced calendar view styling */
          .fc-view {
            min-height: 500px;
            padding: 12px;
          }
          
          /* Modern day headers */
          .fc-col-header {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
            border-bottom: 2px solid #e2e8f0 !important;
          }
          
          .fc-col-header-cell {
            padding: 8px 6px !important;
            font-weight: 600 !important;
            color: #475569 !important;
            text-transform: uppercase !important;
            font-size: 0.7rem !important;
            letter-spacing: 0.05em !important;
          }
          
          /* Enhanced time axis styling */
          .fc-timegrid-axis {
            background: #fafafa !important;
            border-right: 2px solid #e2e8f0 !important;
          }
          
          .fc-timegrid-slot-label {
            font-size: 0.7rem !important;
            color: #64748b !important;
            font-weight: 500 !important;
          }
          
          /* Grid lines enhancement */
          .fc-timegrid-slot {
            border-top: 1px solid #f1f5f9 !important;
          }
          
          .fc-timegrid-slot:nth-child(4n) {
            border-top: 1px solid #e2e8f0 !important;
          }
          
          /* Current time indicator */
          .fc-timegrid-now-indicator-line {
            border-color: #ef4444 !important;
            border-width: 2px !important;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.3) !important;
          }
          
          .fc-timegrid-now-indicator-arrow {
            border-left-color: #ef4444 !important;
            border-width: 8px !important;
          }
          
          /* Today's date highlighting */
          .fc-day-today {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%) !important;
          }
          
          .fc-col-header-cell.fc-day-today {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
            color: #1d4ed8 !important;
          }
          
          .shift-event {
            background-color: transparent !important;
            border: 2px solid #e5e7eb !important;
            color: #374151 !important;
            font-weight: 500 !important;
          }
          
          .shift-morning {
            background-color: #ccfbf1 !important;
            border-color: #5eead4 !important;
            color: #134e4a !important;
          }
          
          .shift-afternoon {
            background-color: #fef3c7 !important;
            border-color: #fbbf24 !important;
            color: #92400e !important;
          }
          
          .shift-evening {
            background-color: #f3e8ff !important;
            border-color: #a78bfa !important;
            color: #581c87 !important;
          }
          

          
                     .block-event {
             background-color: #ef4444 !important;
             border-color: #dc2626 !important;
             color: white !important;
             font-weight: 600 !important;
           }
           
                       /* Time Off events styling */
            .timeoff-event {
              background-color: #f97316 !important; /* Amber/Orange color */
              border-color: #ea580c !important;
              color: white !important;
              font-weight: 600 !important;
            }
            
            /* API Time Off events styling - full width blocks */
            .api-timeoff-event {
              background-color: rgba(220, 38, 38, 0.8) !important; /* More opaque red */
              border-color: #dc2626 !important;
              color: white !important;
              font-weight: 700 !important;
              border-width: 2px !important;
              width: 100% !important;
              margin: 0 !important;
              border-radius: 4px !important;
            }

            /* Shift background events styling - light blue */
            .fc-bg-event.shift-background {
              background-color: rgba(59, 130, 246, 0.3) !important; /* Light blue background */
              border-left: 4px solid #3b82f6 !important;
              opacity: 1 !important;
              z-index: 1 !important;
            }

            /* Ensure background events are visible in all views */
            .fc-timegrid-col-bg .fc-bg-event.shift-background {
              background-color: rgba(59, 130, 246, 0.3) !important;
              opacity: 1 !important;
            }

            .fc-daygrid-day-bg .fc-bg-event.shift-background {
              background-color: rgba(59, 130, 246, 0.3) !important;
              opacity: 1 !important;
            }

            /* Force background events to be visible */
            .fc-bg-event {
              opacity: 1 !important;
              pointer-events: none !important;
            }

            /* Specific styling for shift background events */
            .fc-bg-event[data-event-type="shift"] {
              background-color: rgba(59, 130, 246, 0.3) !important;
              border-left: 4px solid #3b82f6 !important;
            }

            /* Working shift events */
            .shift-event {
              background-color: rgba(59, 130, 246, 0.3) !important; /* Light blue */
              border-color: #2563eb !important;
              color: #1e40af !important;
              font-weight: 600 !important;
              border-width: 1px !important;
            }
            
                     /* Enhanced Shift block events */
           .shift-block-event {
             background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(29, 78, 216, 0.95) 100%) !important;
             border: 2px solid #2563eb !important;
             color: white !important;
             font-weight: 700 !important;
             z-index: 15 !important;
             position: relative !important;
             opacity: 1 !important;
             visibility: visible !important;
             display: block !important;
             width: 100% !important;
             border-radius: 8px !important;
             box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
             backdrop-filter: blur(8px) !important;
           }
           
           .shift-block-event:hover {
             transform: translateY(-1px) !important;
             box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4) !important;
           }
           
           /* Enhanced Override shift blocks - Light Green */
           .shift-block-event[data-override="true"] {
             background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%) !important;
             border: 3px solid #16a34a !important;
             box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
           }
           
           .shift-block-event[data-override="true"]:hover {
             box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4) !important;
           }
            
            
          
          /* Time-off event content styling */
          .timeoff-event-content {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          
          /* Cancel button styling */
          .cancel-timeoff-btn {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 1px solid #dc2626 !important;
            border-radius: 50% !important;
            width: 16px !important;
            height: 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            color: #dc2626 !important;
            font-size: 8px !important;
            transition: all 0.2s ease !important;
            flex-shrink: 0 !important;
          }
          
          .cancel-timeoff-btn:hover {
            background: #dc2626 !important;
            color: white !important;
            transform: scale(1.1) !important;
          }
          
          .appointment-event {
            background-color: #3b82f6 !important;
            border-color: #2563eb !important;
            color: white !important;
            font-weight: 600 !important;
          }
          
          /* Enhanced Event Styling */
          .fc-event {
            cursor: pointer;
            border-radius: 8px !important;
            margin: 2px 1px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            backdrop-filter: blur(8px) !important;
          }
          
          .fc-event:hover {
            opacity: 0.95 !important;
            transform: translateY(-2px) scale(1.02) !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
            z-index: 100 !important;
          }
          
          /* Modern event text styling */
          .fc-event-main {
            padding: 2px 6px !important;
          }
          
          .fc-event-title {
            font-weight: 600 !important;
            font-size: 0.7rem !important;
            line-height: 1.2 !important;
          }
          
          /* Make shift events more prominent in month view */
          .fc-daygrid-event {
            font-size: 0.65rem !important;
            padding: 1px 3px !important;
          }
          
          /* Style for time grid events (week/day view) */
          .fc-timegrid-event {
            font-size: 0.65rem !important;
            padding: 1px 3px !important;
          }
          
          /* Style for override shifts - now clickable for action dialog */
          .fc-event[data-override="true"] {
            position: relative !important;
            cursor: pointer !important;
            border: 2px solid #dc2626 !important;
            z-index: 10 !important;
            pointer-events: auto !important; /* Enable clicks on the event */
          }
          
          .fc-event[data-override="true"]:hover {
            cursor: pointer !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            opacity: 0.9 !important;
          }
          
          /* Ensure block events are visible above override events */
          .fc-event.block-event,
          .fc-event.timeoff-event,
          .fc-event.api-timeoff-event {
            z-index: 20 !important;
            position: relative !important;
          }
          
          /* Override events should not interfere with block events */
          .fc-event[data-override="true"] .cancel-override-btn {
            z-index: 30 !important;
          }
          
          /* Ensure block events are always visible and properly styled */
          .block-event-visible {
            z-index: 20 !important;
            position: relative !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          /* Force block events to be visible even when override events are present */
          .fc-event.block-event,
          .fc-event.timeoff-event,
          .fc-event.api-timeoff-event {
            z-index: 20 !important;
            position: relative !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            display: block !important;
            width: 100% !important;
            margin: 1px 0 !important;
          }
          
          /* Ensure block events are not hidden by other events */
          .fc-event[data-event-type="block"] {
            z-index: 20 !important;
            position: relative !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          /* Override events should not hide block events */
          .fc-event[data-override="true"] {
            z-index: 10 !important;
          }
          
          /* Time-off events styling */
          .fc-event[data-event-type="timeoff"] {
            background-color: #ef4444 !important;
            border-color: #dc2626 !important;
            color: white !important;
            cursor: pointer !important;
            z-index: 15 !important;
            border-width: 2px !important;
            font-weight: 600 !important;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3) !important;
          }
          
          .fc-event[data-event-type="timeoff"]:hover {
            background-color: #dc2626 !important;
            transform: scale(1.05) !important;
            transition: all 0.2s ease !important;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
            z-index: 25 !important;
          }
          
          /* Test time-off event styling */
          .fc-event[data-event-id="test-timeoff-event"] {
            background-color: #dc2626 !important;
            border-color: #b91c1c !important;
            color: white !important;
            font-weight: bold !important;
            cursor: pointer !important;
            border-width: 3px !important;
            box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3) !important;
            animation: pulse 2s infinite !important;
            z-index: 30 !important;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          
          /* Time-off event content styling */
          .timeoff-event-content {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 4px !important;
          }
          
          /* Style for override event content */
          .override-event-content {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
          }
          
          .cancel-override-btn {
            position: absolute !important;
            top: -8px !important;
            right: -8px !important;
            background: #dc2626 !important;
            color: white !important;
            border-radius: 50% !important;
            width: 20px !important;
            height: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 1000 !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            transition: all 0.2s ease !important;
            border: none !important;
            padding: 0 !important;
            outline: none !important;
            pointer-events: auto !important;
          }
          
          .cancel-override-btn:hover {
            background: #b91c1c !important;
            transform: scale(1.1) !important;
          }
          
          .cancel-override-btn:focus {
            outline: 2px solid #dc2626 !important;
            outline-offset: 2px !important;
          }
        `}</style>
       
       {/* Modals */}
       <EditShiftModal
         open={editShiftModal.open}
         onOpenChange={(open) => setEditShiftModal(prev => ({ ...prev, open }))}
         doctorId={doctorId}
         shiftDate={editShiftModal.shiftDate}
         shiftName={editShiftModal.shiftName}
         initialData={editShiftModal.initialData}
         onSave={handleSaveOverride}
         onDelete={editShiftModal.initialData ? handleDeleteOverride : undefined}
         isLoading={createOverrideMutation.isPending || deleteOverrideMutation.isPending}
       />
       


        <PersonalizedScheduleModal
          open={personalizedScheduleModal.open}
          onOpenChange={(open) => {
            // Prevent opening if an override event was recently clicked
            const overrideEvent = document.querySelector('.fc-event[data-override="true"]:focus, .fc-event[data-override="true"]:active');
            if (overrideEvent && open) {
              console.log('Preventing PersonalizedScheduleModal from opening - override event active');
              return;
            }
            setPersonalizedScheduleModal(prev => ({ ...prev, open }));
          }}
          doctorId={doctorId}
          initialDate={personalizedScheduleModal.initialDate}
          initialStartDateTime={personalizedScheduleModal.initialStartDateTime}
          initialEndDateTime={personalizedScheduleModal.initialEndDateTime}
          onSave={handleSavePersonalizedSchedule}
          onSaveBlock={handleSaveBlockFromPersonalized}
          isLoading={createOverrideMutation.isPending}
        />

        <DeleteTimeOffDialog
          isOpen={deleteTimeOffModal.open}
          onClose={() => setDeleteTimeOffModal({ open: false, timeOffData: undefined })}
          onConfirm={handleDeleteTimeOff}
          timeOffData={deleteTimeOffModal.timeOffData}
          isPending={deleteTimeOffMutation.isPending}
        />

        <CancelOverrideDialog
          isOpen={cancelOverrideModal.open}
          onClose={() => setCancelOverrideModal({ open: false, overrideData: undefined })}
          onConfirm={handleCancelOverride}
          overrideData={cancelOverrideModal.overrideData}
          isPending={deleteOverrideMutation.isPending}
        />

        <OverrideActionDialog
          isOpen={overrideActionModal.open}
          onClose={() => setOverrideActionModal({ open: false, overrideData: undefined })}
          onCancel={handleOverrideActionCancel}
          onUpdate={handleOverrideActionUpdate}
          overrideData={overrideActionModal.overrideData}
          isPending={deleteOverrideMutation.isPending}
        />

        <AppointmentCancelDialog
          isOpen={appointmentCancelModal.open}
          onClose={() => setAppointmentCancelModal({ open: false, appointmentData: undefined })}
          onConfirm={handleCancelAppointment}
          appointmentData={appointmentCancelModal.appointmentData}
          isPending={isCancelPending}
        />

        {/* Success Dialog */}
        <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog(prev => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {successDialog.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-gray-600 mb-4">
                {successDialog.message}
              </p>
              
              {successDialog.details.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="space-y-2">
                    {successDialog.details.map((detail, index) => (
                      <div key={index} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={async () => {
                  setSuccessDialog(prev => ({ ...prev, open: false }));
                  await refreshCalendarData();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Great! Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
     </div>
   );
 };
