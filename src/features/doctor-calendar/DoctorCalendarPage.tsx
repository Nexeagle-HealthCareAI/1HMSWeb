import React, { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
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
import { useCalendarEvents, useCreateOverride, useDeleteOverride, useCreateBlock, useDeleteBlock, useTimeOff, useCreateTimeOff, useDeleteTimeOff, useDoctorCalendarConfig, useAppointmentCancel } from './hooks/useCalendar';
import { CalendarEvent, CreateOverridePayload, CreateBlockPayload, ShiftName } from './api/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { useDoctorProfile } from '@/features/doctor/hooks/useDoctorProfile';

export const DoctorCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridDay');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const calendarRef = useRef<FullCalendar>(null);
  
  // Modal states
  const [editShiftModal, setEditShiftModal] = useState({
    open: false,
    shiftDate: '',
    shiftName: 'Morning' as ShiftName,
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
  
  // Use doctorId from doctor profile response - wait for it to load
  const doctorId = doctorProfile?.doctorId;
  
  // Get doctor name - prioritize from doctor profile, fallback to user details
  const doctorName = doctorProfile?.name || userDetailsResponse?.userProfile?.fullName || userDetailsResponse?.mobileNumber || 'Doctor';
  
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
  const { data: calendarConfig, isLoading: configLoading } = useDoctorCalendarConfig(doctorId, fromISO, daysCount);
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(doctorId, fromISO, toISO, calendarConfig);
  const { data: timeOffData, isLoading: timeOffLoading } = useTimeOff(doctorId);
  
  // Use real events directly
  const allEvents = events;
  
  // Debug time-off data
  React.useEffect(() => {
    console.log('🔍 Time-off data from API:', {
      timeOffData,
      timeOffLoading,
      doctorId
    });
  }, [timeOffData, timeOffLoading, doctorId]);
  
  // Debug logging
  console.log('🔍 DoctorCalendarPage - Data:', {
    doctorId,
    fromISO,
    toISO,
    daysCount,
    calendarConfig: calendarConfig ? 'present' : 'undefined',
    eventsCount: events.length,
    eventsLoading,
    configLoading,
    currentDate: currentDate.toISOString(),
    view,
    dateRange: getDateRange(),
    apiCallInfo: {
      startDate: fromISO,
      daysCount: daysCount,
      expectedUrl: `/calendar/doctor/config?doctorId=${doctorId}&startDate=${encodeURIComponent(fromISO)}&daysCount=${daysCount}`
    }
  });

  // Debug date range calculation for different views
  console.log('📅 Date Range Calculation:', {
    view,
    currentDate: currentDate.toISOString(),
    calculatedRange: {
      fromISO,
      toISO,
      daysCount,
      fromDate: new Date(fromISO).toLocaleDateString(),
      toDate: new Date(toISO).toLocaleDateString(),
      isMonday: new Date(fromISO).getDay() === 1, // Monday = 1
      isFirstOfMonth: new Date(fromISO).getDate() === 1,
      totalDays: Math.ceil((new Date(toISO).getTime() - new Date(fromISO).getTime()) / (1000 * 60 * 60 * 24)) + 1
    }
  });

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
  const createBlockMutation = useCreateBlock();
  const deleteBlockMutation = useDeleteBlock();
  const createTimeOffMutation = useCreateTimeOff();
  const deleteTimeOffMutation = useDeleteTimeOff();
  const { cancelAppointment, isPending: isCancelPending } = useAppointmentCancel();
  
  // Function to scroll to morning slot
  const scrollToMorningSlot = useCallback(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        // Scroll to 9 AM (morning slot)
        calendarApi.scrollToTime('09:00:00');
        console.log('📅 Scrolled to morning slot (9:00 AM)');
      }
    }
  }, []);

  // Function to scroll to specific shift time
  const scrollToShiftTime = useCallback((shiftName: string, startTime: string) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        // Scroll to the start time of the shift
        calendarApi.scrollToTime(startTime);
        console.log(`📅 Scrolled to ${shiftName} shift (${startTime})`);
        
        // Add visual highlight for morning shift
        if (shiftName.toLowerCase() === 'morning') {
          // Find and highlight morning shift events
          const morningEvents = document.querySelectorAll('.fc-event[data-event-id*="shift"]');
          morningEvents.forEach((eventElement: any) => {
            const eventId = eventElement.getAttribute('data-event-id');
            if (eventId && eventId.includes('shift')) {
              // Add a subtle highlight effect
              eventElement.style.boxShadow = '0 0 10px rgba(74, 222, 128, 0.6)';
              eventElement.style.transform = 'scale(1.02)';
              eventElement.style.transition = 'all 0.3s ease';
              
              // Remove highlight after 3 seconds
              setTimeout(() => {
                eventElement.style.boxShadow = '';
                eventElement.style.transform = '';
              }, 3000);
            }
          });
        }
      }
    }
  }, []);
  
  // Handle view changes
  React.useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        calendarApi.changeView(view);
        
        // Scroll to 9 AM when switching to any time-based view
        if (view === 'timeGridDay' || view === 'timeGridWeek') {
          setTimeout(() => {
            scrollToMorningSlot();
          }, 100); // Small delay to ensure view is fully rendered
        }
      }
    }
  }, [view, scrollToMorningSlot]);

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
      
      // Scroll to morning shift (9 AM) after loading is complete
      if (view === 'timeGridDay' || view === 'timeGridWeek') {
        setTimeout(() => {
          scrollToMorningSlot();
        }, 100); // Small delay to ensure calendar is fully rendered
      }
    }, 1000); // Reduced to 1 second for better UX

    return () => clearTimeout(timer);
  }, [view, scrollToMorningSlot]);

  // Auto-scroll to morning shift when events are loaded
  React.useEffect(() => {
    if (!isInitialLoading && events.length > 0 && (view === 'timeGridDay' || view === 'timeGridWeek')) {
      // Find morning shift events
      const morningShifts = events.filter(event => 
        event.extendedProps?.shiftName?.toLowerCase() === 'morning'
      );
      
      if (morningShifts.length > 0) {
        // Scroll to the first morning shift
        const morningShift = morningShifts[0];
        const startTime = morningShift.extendedProps?.startTime || '09:00:00';
        
        setTimeout(() => {
          scrollToShiftTime('Morning', startTime);
        }, 200);
      } else {
        // Fallback to default morning slot
        setTimeout(() => {
          scrollToMorningSlot();
        }, 200);
      }
    }
  }, [events, isInitialLoading, view, scrollToShiftTime, scrollToMorningSlot]);


  
  // Calendar event handlers
  const handleEventClick = useCallback((info: any) => {
    const event = info.event;
    const eventType = event.extendedProps?.type;
    const shiftName = event.extendedProps?.shiftName;
    
    console.log('🔍 Event clicked:', {
      eventId: event.id,
      eventType,
      title: event.title,
      extendedProps: event.extendedProps,
      start: event.start,
      end: event.end
    });
    
    // Handle time-off events
    if (eventType === 'timeoff' || event.id?.startsWith('timeoff-')) {
      const timeOffId = event.extendedProps?.timeOffId || event.id?.replace('timeoff-', '');
      const reason = event.extendedProps?.reason || event.title;
      const fromDate = event.start?.toISOString();
      const toDate = event.end?.toISOString();
      
      if (timeOffId && fromDate && toDate) {
        setDeleteTimeOffModal({
          open: true,
          timeOffData: {
            timeOffId,
            reason,
            fromDate,
            toDate
          }
        });
      } else {
        console.warn('Missing data for time-off deletion:', { timeOffId, fromDate, toDate });
      }
      return; // Stop processing for time-off events
    }
    
    // Scroll to specific shift time when event is clicked
    if (eventType === 'shift' && shiftName) {
      const startTime = event.extendedProps?.startTime || '09:00:00';
      setTimeout(() => {
        scrollToShiftTime(shiftName, startTime);
      }, 100);
    } else {
      // Default scroll to morning slot for other events
      setTimeout(() => {
        scrollToMorningSlot();
      }, 100);
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
      const timeOffId = target.getAttribute('data-timeoff-id');
      const reason = target.getAttribute('data-reason');
      const fromDate = event.start?.toISOString();
      const toDate = event.end?.toISOString();
      
      if (timeOffId && fromDate && toDate) {
        setDeleteTimeOffModal({
          open: true,
          timeOffData: {
            timeOffId,
            reason: reason || event.title,
            fromDate,
            toDate
          }
        });
      }
      return; // Stop processing the regular event click
    }
    
    if (eventType === 'shift' || (eventType === 'block' && event.extendedProps?.isShiftBlock)) {
      // Open EditShiftModal for regular shift events and shift blocks
      // Note: Override events are already handled at the beginning of this function
      if (!event.start) {
        toast({
          title: "Error",
          description: "Invalid event date",
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
         const timeOffId = event.extendedProps?.timeOffId;
         const reason = event.extendedProps?.reason || event.title;
         const fromDate = event.start?.toISOString();
         const toDate = event.end?.toISOString();
         
         if (timeOffId && fromDate && toDate) {
           setDeleteTimeOffModal({
             open: true,
             timeOffData: {
               timeOffId,
               reason,
               fromDate,
               toDate
             }
           });
         }
       } else {
         toast({
           title: "Block Details",
           description: `${event.title}`,
         });
       }
     }
  }, [toast]);
  
     const handleDateSelect = useCallback((selectInfo: any) => {
     // Scroll to morning slot when date is selected
     setTimeout(() => {
       scrollToMorningSlot();
     }, 50);
     
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
         title: "Shift Block",
         description: "This time period is covered by a shift. Please select a different time or modify the existing shift.",
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
         title: "Time Off Conflict",
         description: "This time period is already blocked. Please select a different time or cancel the existing time-off first.",
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
    // Scroll to morning slot when event is dropped
    setTimeout(() => {
      scrollToMorningSlot();
    }, 100);
    
    // Handle event drag and drop
    toast({
      title: "Event Moved",
      description: `${dropInfo.event.title} moved to ${format(dropInfo.event.start!, 'MMM dd, yyyy')}`,
    });
  }, [toast, scrollToMorningSlot]);
  
  const handleEventResize = useCallback((resizeInfo: any) => {
    // Scroll to morning slot when event is resized
    setTimeout(() => {
      scrollToMorningSlot();
    }, 100);
    
    // Handle event resize
    toast({
      title: "Event Resized",
      description: `${resizeInfo.event.title} resized`,
    });
  }, [toast, scrollToMorningSlot]);
  
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
    scrollTime: '09:00:00', // Initial scroll position to 9 AM
     // Add calendar click handler to scroll to morning slot
     datesSet: (dateInfo: any) => {
       // Scroll to morning slot when calendar dates are set/loaded
       setTimeout(() => {
         scrollToMorningSlot();
       }, 100);
     },
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
          // Override shifts - clickable for action dialog
          const sourceId = arg.event.extendedProps?.sourceId;
          const shiftName = arg.event.extendedProps?.shiftName;
          const startTime = arg.event.extendedProps?.startTime || '09:00';
          const endTime = arg.event.extendedProps?.endTime || '12:00';
          const shiftDate = arg.event.start ? format(arg.event.start, 'yyyy-MM-dd') : '';
          
          // Validate required data
          if (!sourceId || !shiftName || !shiftDate) {
            console.warn('Missing required data for override event:', { sourceId, shiftName, shiftDate });
          }
          
          return {
            html: `
              <div class="fc-event-main-content override-event-content">
                <div class="text-xs font-medium">${arg.event.title}</div>
                <div class="text-xs text-gray-600">Click to manage</div>
              </div>
            `
          };
        } else {
          // Regular shift events
          return {
            html: `
              <div class="fc-event-main-content">
                <div class="text-xs font-medium">${arg.event.title}</div>
              </div>
            `
          };
        }
      } else if (eventType === 'appointment') {
        return {
          html: `
            <div class="fc-event-main-content">
              <div class="text-xs font-bold">${arg.event.extendedProps?.tokenNumber}</div>
              <div class="text-xs">${arg.event.extendedProps?.patientName}</div>
            </div>
          `
        };
      } else if (eventType === 'timeoff') {
        // Time-off events with cancel button
        console.log('🎯 Rendering time-off event:', {
          id: arg.event.id,
          title: arg.event.title,
          type: arg.event.extendedProps?.type
        });
        return {
          html: `
            <div class="fc-event-main-content timeoff-event-content">
              <div class="text-xs font-medium">${arg.event.title}</div>
              <div class="text-xs text-red-200">Click to cancel</div>
            </div>
          `
        };
      } else if (eventType === 'block') {
        const isTimeOff = arg.event.extendedProps?.isTimeOff;
        
        if (isTimeOff) {
          // Time-off events with cancel button
          return {
            html: `
              <div class="fc-event-main-content timeoff-event-content">
                <div class="text-xs font-medium">${arg.event.title}</div>
                <button class="cancel-timeoff-btn" data-timeoff-id="${arg.event.extendedProps?.timeOffId}" data-reason="${arg.event.extendedProps?.reason || arg.event.title}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            `
          };
        } else if (arg.event.extendedProps?.isShiftBlock) {
          // Shift block events - show with time range
          const startTime = arg.event.extendedProps?.startTime || '00:00';
          const endTime = arg.event.extendedProps?.endTime || '00:00';
          const shiftName = arg.event.extendedProps?.shiftName || 'Shift';
          const isOverride = arg.event.extendedProps?.isOverride;
          
          return {
            html: `
              <div class="fc-event-main-content">
                <div class="text-xs font-bold">${shiftName}</div>
                <div class="text-xs">${startTime} - ${endTime}</div>
                ${isOverride ? '<div class="text-xs text-green-200 font-semibold">Personalized</div>' : ''}
              </div>
            `
          };
        } else {
          // Regular block events
          return {
            html: `
              <div class="fc-event-main-content">
                <div class="text-xs font-medium">${arg.event.title}</div>
              </div>
            `
          };
        }
      }
      
      return {
        html: `
          <div class="fc-event-main-content">
            <div class="text-xs">${arg.event.title}</div>
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
            if (shiftName === 'Morning') classes.push('shift-morning');
            else if (shiftName === 'Afternoon') classes.push('shift-afternoon');
            else if (shiftName === 'Evening') classes.push('shift-evening');
            else if (shiftName === 'Night') classes.push('shift-night');
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
  const handleSaveOverride = (payload: CreateOverridePayload) => {
    createOverrideMutation.mutate(payload, {
      onSuccess: (data) => {
    toast({
          title: "Success",
          description: data.message || "Shift override created successfully",
    });
    setEditShiftModal(prev => ({ ...prev, open: false }));
        // Reload page after successful override creation
        setTimeout(() => {
          window.location.reload();
        }, 1000);
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
          await createOverrideMutation.mutateAsync(payload);
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
          title: "Schedule Saved Successfully! 🎉",
          message: `Your personalized schedule has been saved successfully. Your new working hours are now active.`,
          details: [
            `✅ ${successCount} schedule override${successCount > 1 ? 's' : ''} created`,
            `📅 Changes will be reflected in your calendar immediately`,
            `👥 Patients can now book appointments during your updated hours`
          ]
        });
      } else if (successCount > 0 && errorCount > 0) {
        setSuccessDialog({
          open: true,
          title: "Partially Saved ⚠️",
          message: `Some of your schedule overrides were saved, but ${errorCount} failed to save.`,
          details: [
            `✅ ${successCount} override${successCount > 1 ? 's' : ''} saved successfully`,
            `❌ ${errorCount} override${errorCount > 1 ? 's' : ''} failed to save`,
            `🔄 You may want to try saving the failed overrides again`
          ]
        });
      } else {
        // Keep toast for error cases
        toast({
          title: "Error",
          description: "Failed to create schedule overrides",
          variant: "destructive",
        });
      }
      
      setPersonalizedScheduleModal(prev => ({ ...prev, open: false }));
      
      // Reload page after successful personalized schedule creation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };
    
    processPayloads();
  };

       const handleSaveBlockFromPersonalized = (payload: CreateBlockPayload) => {
    // Convert CreateBlockPayload to CreateTimeOffRequest
    // Format dates to YYYY-MM-DD format for the API
    const fromDate = new Date(payload.startDateTime);
    const toDate = new Date(payload.endDateTime);
    
         const timeOffRequest = {
       doctorId: payload.doctorId,
       fromDate: format(fromDate, 'yyyy-MM-dd'),
       toDate: format(toDate, 'yyyy-MM-dd'),
       reason: payload.title
     };
     
     createTimeOffMutation.mutate(timeOffRequest, {
       onSuccess: (data) => {
         setSuccessDialog({
           open: true,
           title: "Time Off Scheduled Successfully! 🏖️",
           message: "Your time off has been scheduled and you will be unavailable during the selected period.",
           details: [
             `✅ Time off period blocked in your calendar`,
             `📅 Duration: ${format(fromDate, 'MMM dd, yyyy HH:mm')} - ${format(toDate, 'MMM dd, yyyy HH:mm')}`,
             `🚫 No appointments can be booked during this time`,
             `📱 You can cancel this time off anytime from the calendar`
           ]
         });
         setPersonalizedScheduleModal(prev => ({ ...prev, open: false }));
         
         // Reload page after successful time off creation
         setTimeout(() => {
           window.location.reload();
         }, 1000);
       },
       onError: (error) => {
         toast({
           title: "Error",
           description: "Failed to schedule time off",
           variant: "destructive",
         });
       }
     });
   };
  
  const handleDeleteOverride = () => {
    // TODO: Implement when override API is available
    toast({
      title: "Info",
      description: "Delete override functionality not yet implemented",
    });
    setEditShiftModal(prev => ({ ...prev, open: false }));
  };

  const handleDeleteTimeOff = () => {
    if (!deleteTimeOffModal.timeOffData?.timeOffId) return;
    
    deleteTimeOffMutation.mutate(deleteTimeOffModal.timeOffData.timeOffId, {
      onSuccess: (data) => {
        toast({
          title: "Success",
          description: data.message || "Time off deleted successfully",
        });
        setDeleteTimeOffModal({ open: false, timeOffData: undefined });
        
        // Reload page after successful time off deletion
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to delete time off",
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
        title: "Error",
        description: "No override data found for cancellation",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Canceling override with data:', overrideData);
    
    deleteOverrideMutation.mutate(overrideData.overrideId, {
      onSuccess: (data) => {
        console.log('Override canceled successfully:', data);
        toast({
          title: "Success",
          description: data.message || "Shift override canceled successfully",
        });
        setCancelOverrideModal({ open: false, overrideData: undefined });
        
        // Reload page after successful override cancellation
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      onError: (error) => {
        console.error('Failed to cancel override:', error);
        toast({
          title: "Error",
          description: "Failed to cancel shift override. Please try again.",
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
        title: "Error",
        description: "No override data found for cancellation",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Canceling override from action dialog:', overrideData);
    
    deleteOverrideMutation.mutate(overrideData.overrideId, {
      onSuccess: (data) => {
        console.log('Override canceled successfully:', data);
        toast({
          title: "Success",
          description: data.message || "Shift override canceled successfully",
        });
        setOverrideActionModal({ open: false, overrideData: undefined });
        
        // Reload page after successful override cancellation
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      onError: (error) => {
        console.error('Failed to cancel override:', error);
        toast({
          title: "Error",
          description: "Failed to cancel shift override. Please try again.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleOverrideActionUpdate = () => {
    const overrideData = overrideActionModal.overrideData;
    
    if (!overrideData) {
      console.error('No override data available for update');
      toast({
        title: "Error",
        description: "No override data found for update",
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
        title: "Error",
        description: "No appointment data found for cancellation",
        variant: "destructive",
      });
      return;
    }
    
    const success = await cancelAppointment(appointmentCancelModal.appointmentData.appointmentId);
    
    if (success) {
      setAppointmentCancelModal({ open: false, appointmentData: undefined });
      // Reload page after successful appointment cancellation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };


  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            User ID Required
          </h3>
          <p className="text-gray-600">
            Unable to get user ID. Please try logging in again.
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
            {isInitialLoading ? 'Initializing Calendar...' : doctorProfileLoading ? 'Loading Doctor Profile...' : configLoading ? 'Loading Calendar Configuration...' : 'Doctor Profile Required'}
          </h3>
          <p className="text-gray-600">
            {isInitialLoading ? 'Please wait while we prepare your calendar and load all data.' : doctorProfileLoading ? 'Please wait while we load your doctor profile.' : configLoading ? 'Please wait while we load your work schedule configuration.' : 'Unable to load doctor profile. Please try refreshing the page.'}
          </p>
          {doctorProfileError && (
            <div className="text-red-600 text-sm mt-2">
              <p className="font-medium">Error loading doctor profile:</p>
              <p>{doctorProfileError.message || 'Failed to load doctor profile'}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                Retry
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
                      {isInitialLoading ? 'Preparing your calendar...' : 
                       doctorProfileLoading ? 'Loading your profile...' : 
                       configLoading ? 'Loading schedule configuration...' : 'Loading...'}
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      {isInitialLoading ? 'Setting up your personalized calendar experience' : 
                       doctorProfileLoading ? 'Fetching your doctor profile details' : 
                       configLoading ? 'Loading your work schedule settings' : 'Please wait...'}
                    </p>
                    {doctorProfileError && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-700 dark:text-red-400 font-medium">Error loading doctor profile</p>
                        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{doctorProfileError.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div 
                  className="calendar-container"
                  onClick={() => {
                    // Scroll to morning slot when calendar container is clicked
                    setTimeout(() => {
                      scrollToMorningSlot();
                    }, 50);
                  }}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <FullCalendar
                      key={`${view}-${currentDate.toISOString()}`}
                      ref={calendarRef}
                      {...calendarOptions}
                    />
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
          
          .shift-night {
            background-color: #e2e8f0 !important;
            border-color: #94a3b8 !important;
            color: #334155 !important;
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
          
          .fc-event[data-override="true"]:hover {
            cursor: default !important;
            transform: none !important;
            box-shadow: none !important;
            opacity: 0.8 !important;
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
          isLoading={createOverrideMutation.isPending || createBlockMutation.isPending}
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
                onClick={() => {
                  setSuccessDialog(prev => ({ ...prev, open: false }));
                  // Reload page after success dialog is closed
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
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
