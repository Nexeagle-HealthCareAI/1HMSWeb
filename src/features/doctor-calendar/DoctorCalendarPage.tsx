import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, X } from 'lucide-react';
import {
  GamifiedHeader,
  EditShiftModal,
  PersonalizedScheduleModal,
  DeleteTimeOffDialog,
  CancelOverrideDialog,
  OverrideActionDialog,
  ShiftDetailsCard,
  CalendarEventContent,
  CalendarSidebar,
  AvailabilityRosterPage
} from './components';
import { useCalendarEvents, useCreateOverride, useDeleteOverride, useCreateTimeOff, useDeleteTimeOff, useDoctorCalendarConfig, useTimeOff, useHospitalDoctors } from './hooks/useCalendar';
import { HospitalDoctorItem } from './api/doctorListApi';
import { CalendarEvent, CreateOverridePayload, CreateBlockPayload, ShiftName, ShiftDetail, CreateTimeOffRequest } from './api/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore, useAppStore } from '@/store';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { useDoctorProfile } from '@/features/doctor/hooks/useDoctorProfile';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';

// Roles that manage OTHER doctors' calendars via a picker, rather than only their own.
const STAFF_SCHEDULER_ROLES = ['Admin', 'AdminDoctor', 'Receptionist'];

interface DoctorCalendarPageProps {
  // Pre-select a doctor without relying on the URL — used when this page is embedded inline
  // (e.g. in a dialog on the Appointment Board) rather than reached via the /calendar route.
  // Falls back to ?doctorId= when unset, so the routed usage is unaffected.
  initialDoctorId?: string;
  // Also for embedded usage: lets the host close/hide the dialog around this page instead of
  // (or in addition to) the internal "Back to Availability" control.
  onRequestClose?: () => void;
}

export const DoctorCalendarPage: React.FC<DoctorCalendarPageProps> = ({ initialDoctorId, onRequestClose }) => {
  const { t } = useTranslation();
  const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [currentDate, setCurrentDate] = useState(new Date());
  // Month is the natural default for "which days is this doctor off" — day/week views (hour
  // grids) suit fine-tuning shift hours, a secondary task most staff never touch.
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
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
  const [deleteOverrideConfirm, setDeleteOverrideConfirm] = useState({
    open: false,
    overrideId: undefined as string | undefined,
    shiftName: undefined as string | undefined,
    shiftDate: undefined as string | undefined,
    startTime: undefined as string | undefined,
    endTime: undefined as string | undefined,
  });

  const { toast } = useToast();
  const { getUserId, getUserRoles } = useAuthStore();
  const userId = getUserId() || '';
  const isLowBandwidthMode = useAppStore((state) => state.isLowBandwidthMode);
  const authStore = useAuthStore();
  const hospitalId = authStore.getHospitalId();

  // Admin/AdminDoctor/Receptionist manage ANY doctor's calendar via a picker;
  // Doctor role keeps the original self-service behavior (own profile, no picker).
  const userRoles = getUserRoles();
  const isStaffScheduler = userRoles.some(role => STAFF_SCHEDULER_ROLES.includes(role));

  const [searchParams, setSearchParams] = useSearchParams();
  // initialDoctorId (embedded usage) is only honored until the user explicitly backs out to the
  // roster — otherwise "Back to Availability" would immediately re-resolve to the same doctor,
  // since the prop itself doesn't change when the user navigates away from it internally.
  const [initialDoctorIdDismissed, setInitialDoctorIdDismissed] = useState(false);
  const doctorIdFromUrl = searchParams.get('doctorId') || (initialDoctorIdDismissed ? undefined : initialDoctorId) || undefined;

  const { data: hospitalDoctors = [], isLoading: hospitalDoctorsLoading } = useHospitalDoctors(isStaffScheduler ? (hospitalId || '') : '');
  const [selectedStaffDoctor, setSelectedStaffDoctor] = useState<HospitalDoctorItem | undefined>(undefined);

  // Pre-select ONLY from ?doctorId= (arriving from the Appointment Board with a doctor already
  // chosen there) — never auto-pick "the first doctor". With no explicit doctorId, staff land on
  // the availability roster instead (see showRoster below): checking who's out today is the
  // common task, picking a doctor blind to find out is not.
  React.useEffect(() => {
    if (!isStaffScheduler || selectedStaffDoctor || hospitalDoctors.length === 0 || !doctorIdFromUrl) return;
    const preselect = hospitalDoctors.find(d => d.doctorId === doctorIdFromUrl);
    if (preselect) setSelectedStaffDoctor(preselect);
  }, [isStaffScheduler, hospitalDoctors, doctorIdFromUrl, selectedStaffDoctor]);

  // Staff with no doctor chosen yet (no ?doctorId=, nothing picked from the switcher) see the
  // roster instead of a calendar. Doctor role never sees this — they always go straight to their
  // own calendar.
  const showRoster = isStaffScheduler && !doctorIdFromUrl && !selectedStaffDoctor;

  const handleSelectDoctorFromRoster = useCallback((id: string, name?: string) => {
    const found = hospitalDoctors.find(d => d.doctorId === id);
    setSelectedStaffDoctor(found || { doctorId: id, fullName: name, departmentName: undefined });
  }, [hospitalDoctors]);

  const handleBackToRoster = useCallback(() => {
    setSelectedStaffDoctor(undefined);
    setInitialDoctorIdDismissed(true);
    if (searchParams.get('doctorId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('doctorId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Direct doctor API call for lazy loading - independent of dashboard. Disabled for staff
  // schedulers, who resolve the target doctor from the picker above instead of their own profile.
  const { data: doctorProfile, isLoading: doctorProfileLoading, error: doctorProfileError } = useDoctorProfile(isStaffScheduler ? undefined : userId);

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

  const doctorId = isStaffScheduler ? selectedStaffDoctor?.doctorId : doctorProfile?.doctorId;

  // Get doctor name - staff schedulers see the selected doctor's name; self-service uses the logged-in user's own name
  const doctorName = isStaffScheduler
    ? (selectedStaffDoctor?.fullName || t('doctorCalendar.switcher.placeholder', 'Select a doctor'))
    : (userDetailsResponse?.userProfile?.fullName || userDetailsResponse?.mobileNumber || t('doctorCalendar.doctorFallback'));

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

  // Fetch existing time-offs to show in the modal
  const { data: existingTimeOffData } = useTimeOff(doctorId || '', hospitalId || '');

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
  const { data: calendarConfig, isLoading: configLoading, refetch: refetchCalendarConfig } = useDoctorCalendarConfig(doctorId, hospitalId, fromISO, daysCount);
  const { data: events = [], isLoading: eventsLoading, refetch: refetchCalendarEvents } = useCalendarEvents(doctorId, hospitalId, fromISO, toISO, calendarConfig);

  // Use real events directly
  const allEvents = events;
  const clickToManageHint = t('doctorCalendar.clickToManageHint');
  const overrideBadgeLabel = t('doctorCalendar.overrideBadge');

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
  // Log the inputs driving event hydration for easier debugging
  React.useEffect(() => {
  }, [doctorId, hospitalId, fromISO, toISO, daysCount]);



  // Debug time-off events specifically
  const timeOffEvents = events.filter(event => event.type === 'timeoff' || event.id?.startsWith('timeoff-'));

  // Mutations
  const createOverrideMutation = useCreateOverride();
  const deleteOverrideMutation = useDeleteOverride();
  // Removed mock block mutations
  const createTimeOffMutation = useCreateTimeOff();
  const deleteTimeOffMutation = useDeleteTimeOff();



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

  // Auto-scroll to earliest shift
  React.useEffect(() => {
    if (calendarRef.current && events.length > 0 && !isInitialLoading) {
      const calendarApi = calendarRef.current.getApi();

      // Filter for shift events only
      const shiftEvents = events.filter(e =>
        e.extendedProps?.type === 'shift' ||
        // Also check if it's a shift that might be marked differently
        (e.extendedProps as any)?.isWorkingShift
      );

      if (shiftEvents.length > 0) {
        // Find the earliest start time
        let earliestTime = '23:59:59';
        let hasShifts = false;

        shiftEvents.forEach(event => {
          if (event.start) {
            const date = new Date(event.start);
            const timeStr = format(date, 'HH:mm:ss');
            if (timeStr < earliestTime) {
              earliestTime = timeStr;
              hasShifts = true;
            }
          }
        });

        if (hasShifts) {
          // Add a 30-minute buffer if possible (handled by subtracting from the date object or string manipulation)
          // Simple string manipulation for HH:mm:ss
          const [hours, minutes, seconds] = earliestTime.split(':').map(Number);
          let scrollHours = hours;
          let scrollMinutes = minutes - 30;

          if (scrollMinutes < 0) {
            scrollMinutes += 60;
            scrollHours -= 1;
          }

          if (scrollHours < 0) scrollHours = 0;

          const scrollTime = `${String(scrollHours).padStart(2, '0')}:${String(scrollMinutes).padStart(2, '0')}:00`;

          calendarApi.scrollToTime(scrollTime);
        }
      }
    }
  }, [events, isInitialLoading, view, currentDate]);

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
      title: t('doctorCalendar.messages.error'),
      description: t('doctorCalendar.errors.failedToDeleteTimeOff'),
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
          reason: event.extendedProps?.reason || null,
          overrideId: event.extendedProps?.overrideId
        }
      });
    } else if (eventType === 'block') {
      // Handle time-off blocks
      const isTimeOff = event.extendedProps?.isTimeOff;
      if (isTimeOff) {
        // Open delete dialog for time-off events
        openTimeOffDeleteModal(event);
      } else {
        toast({
          title: t('doctorCalendar.blockDetailsTitle'),
          description: t('doctorCalendar.blockDetailsDescription', { title: event.title ?? '' }),
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
        title: t('doctorCalendar.conflicts.shiftBlock'),
        description: t('doctorCalendar.conflicts.shiftBlockMessage'),
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
        title: t('doctorCalendar.conflicts.timeOffConflict'),
        description: t('doctorCalendar.conflicts.timeOffConflictMessage'),
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

  // Drag-move/resize have no dedicated update endpoint on the backend — persisted as
  // delete-old + create-new against the existing override/time-off create+delete endpoints.
  const persistEventTimeChange = useCallback(async (changeInfo: any, newStart: Date, newEnd: Date) => {
    const event = changeInfo.event;
    const props = event.extendedProps || {};
    const isTimeOff = props.type === 'timeoff' || props.isTimeOff;
    const isShiftLike = props.type === 'shift';

    if (!doctorId || !hospitalId || (!isTimeOff && !isShiftLike)) {
      changeInfo.revert();
      return;
    }

    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    try {
      if (isTimeOff) {
        const timeOffId = props.timeOffId;
        if (!timeOffId) {
          changeInfo.revert();
          return;
        }
        // FullCalendar's allDay end is exclusive; subtract a day for the inclusive "toDate"
        const inclusiveEnd = new Date(newEnd.getTime() - 24 * 60 * 60 * 1000);
        await deleteTimeOffMutation.mutateAsync({ doctorId, hospitalId, timeOffId });
        await createTimeOffMutation.mutateAsync({
          doctorId,
          hospitalId,
          fromDate: toLocalDateStr(newStart),
          toDate: toLocalDateStr(inclusiveEnd),
          reason: props.reason || event.title,
        });
      } else {
        const overrideId = props.overrideId;
        const shiftDate = format(newStart, 'yyyy-MM-dd');
        const shiftDetails: ShiftDetail[] = [{
          shiftName: props.shiftName,
          startTime: format(newStart, 'HH:mm:ss'),
          endTime: format(newEnd, 'HH:mm:ss'),
          slotDurationInMinutes: props.slotDuration || 15,
          recurringDays: [],
        }];
        if (overrideId) {
          await deleteOverrideMutation.mutateAsync(overrideId);
        }
        const payload: CreateOverridePayload = {
          doctorId,
          hospitalId,
          overrideDate: shiftDate,
          startDate: shiftDate,
          endDate: shiftDate,
          shiftDetails,
        };
        await createOverrideMutation.mutateAsync(payload);
      }

      toast({
        title: t('doctorCalendar.eventMoved'),
        description: t('doctorCalendar.eventMovedDescription', {
          title: event.title,
          date: format(newStart, 'MMM dd, yyyy')
        }),
      });
      await Promise.allSettled([refetchCalendarConfig(), refetchCalendarEvents()]);
    } catch (error) {
      changeInfo.revert();
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.errors.failedToCreateOverride'),
        variant: 'destructive',
      });
    }
  }, [doctorId, hospitalId, deleteTimeOffMutation, createTimeOffMutation, deleteOverrideMutation, createOverrideMutation, refetchCalendarConfig, refetchCalendarEvents, toast, t]);

  const handleEventDrop = useCallback((dropInfo: any) => {
    persistEventTimeChange(dropInfo, dropInfo.event.start, dropInfo.event.end);
  }, [persistEventTimeChange]);

  const handleEventResize = useCallback((resizeInfo: any) => {
    persistEventTimeChange(resizeInfo, resizeInfo.event.start, resizeInfo.event.end);
  }, [persistEventTimeChange]);

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
    editable: true, // Enables eventDrop/eventResize (drag-to-reschedule) - persisted via persistEventTimeChange
    eventStartEditable: true,
    eventDurationEditable: true,
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
    eventOverlap: true, // Allow events to overlap
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
      if (info.event.extendedProps?.isOverride || info.event.extendedProps?.dataSource === 'Override') {
        info.el.setAttribute('data-override', 'true');
        info.el.closest('.fc-timegrid-event-harness')?.classList.add('full-width-harness');
        console.log('📅 Set data-override and harness class for event:', info.event.id);
      }

      // Also ensure regular shifts are full width
      if (eventType === 'shift') {
        info.el.closest('.fc-timegrid-event-harness')?.classList.add('full-width-harness');
      }

      // Add data-event-type attribute for better CSS targeting
      if (eventType) {
        info.el.setAttribute('data-event-type', eventType);
      }

      // Override events are now handled by the main eventClick handler
      // No additional event listeners needed
    },
    eventContent: (arg: any) => {
      return (
        <CalendarEventContent
          event={arg.event}
          timeText={arg.timeText}
        />
      );
    },
    eventClassNames: (arg: any) => {
      const eventType = arg.event.extendedProps?.type;
      const shiftName = arg.event.extendedProps?.shiftName;
      const isTimeOff = arg.event.extendedProps?.isTimeOff;
      const isWorkingShift = arg.event.extendedProps?.isWorkingShift;
      const isBackground = arg.event.display === 'background';
      const dataSource = arg.event.extendedProps?.dataSource;

      const classes = [];

      if (eventType === 'shift') {
        if (isBackground && isWorkingShift) {
          // Background shift events
          classes.push('shift-background');
        } else {
          // Regular shift events
          classes.push('shift-event');
          if (!isBackground) {
            classes.push(dataSource === 'Override' ? 'shift-event-override' : 'shift-event-default');
          }
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
    if (isSubscriptionReadOnly) { blockAction('Adding schedule overrides'); return; }
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
          title: t('doctorCalendar.conflicts.timeOffConflict'),
          description: t('doctorCalendar.conflicts.timeOffConflictToday'),
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
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.errors.failedToOpenModal'),
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

  // Explicitly refetch the API when the user changes views or dates
  // This ensures the backend is queried for latest overrides or shifts
  React.useEffect(() => {
    if (!isInitialLoading) {
      refreshCalendarData();
    }
  }, [currentDate, view, isInitialLoading, refreshCalendarData]);

  const handleSaveOverride = (payload: CreateOverridePayload) => {
    // Ensure hospitalId is present in payload
    const finalPayload: CreateOverridePayload = {
      ...payload,
      hospitalId: hospitalId || payload.hospitalId,
    };
    createOverrideMutation.mutate(finalPayload, {
      onSuccess: async (data) => {
        toast({
          title: t('doctorCalendar.success'),
          description: data.message || t('doctorCalendar.notifications.shiftOverrideCreated'),
        });
        setEditShiftModal(prev => ({ ...prev, open: false }));
        // Refresh calendar data without reloading the entire page
        await refreshCalendarData();
      },
      onError: (error) => {
        toast({
          title: t('doctorCalendar.error'),
          description: t('doctorCalendar.errors.failedToCreateOverride'),
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
          title: t('doctorCalendar.notifications.scheduleSaved'),
          message: t('doctorCalendar.notifications.scheduleSavedMessage'),
          details: [
            `✅ ${t('doctorCalendar.notifications.overridesCreated', { count: successCount })}`,
            `📅 ${t('doctorCalendar.notifications.changesReflected')}`,
            `👥 ${t('doctorCalendar.notifications.patientsCanBook')}`
          ]
        });
      } else if (successCount > 0 && errorCount > 0) {
        setSuccessDialog({
          open: true,
          title: t('doctorCalendar.notifications.partiallySaved'),
          message: t('doctorCalendar.notifications.partiallySavedMessage'),
          details: [
            `✅ ${t('doctorCalendar.notifications.overridesSaved', { count: successCount })}`,
            `❌ ${t('doctorCalendar.notifications.overridesFailed', { count: errorCount })}`,
            `🔄 ${t('doctorCalendar.notifications.tryAgainFailed')}`
          ]
        });
      } else {
        // Keep toast for error cases
        toast({
          title: t('doctorCalendar.messages.error'),
          description: t('doctorCalendar.errors.failedToCreateOverrides'),
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
        description: t('doctorCalendar.hospitalContextMissing'),
        variant: 'destructive',
      });
      return;
    }

    // Convert CreateBlockPayload to CreateTimeOffRequest
    // Use LOCAL date strings (YYYY-MM-DD) to avoid UTC timezone shift in IST/other zones
    const fromDateObj = new Date(payload.startDateTime);
    const toDateObj = new Date(payload.endDateTime);

    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const timeOffRequest: CreateTimeOffRequest = {
      doctorId: payload.doctorId,
      hospitalId,
      fromDate: toLocalDateStr(fromDateObj),
      toDate: toLocalDateStr(toDateObj),
      reason: payload.title
    };

    createTimeOffMutation.mutate(timeOffRequest, {
      onSuccess: async (data) => {
        setSuccessDialog({
          open: true,
          title: t('doctorCalendar.notifications.timeOffScheduled'),
          message: t('doctorCalendar.notifications.timeOffScheduledMessage'),
          details: [
            `✅ ${t('doctorCalendar.notifications.timeOffBlocked')}`,
            `📅 ${t('doctorCalendar.notifications.duration')}: ${format(fromDateObj, 'MMM dd, yyyy')} - ${format(toDateObj, 'MMM dd, yyyy')}`,
            `🚫 ${t('doctorCalendar.notifications.noAppointmentsBooked')}`,
            `📱 ${t('doctorCalendar.notifications.cancelTimeOffAnytime')}`
          ]
        });
        setPersonalizedScheduleModal(prev => ({ ...prev, open: false }));
        await refreshCalendarData();
        // TODO: Refetch calendar events here if needed
      },
      onError: (error) => {
        toast({
          title: t('doctorCalendar.messages.error'),
          description: t('doctorCalendar.errors.failedToScheduleTimeOff'),
          variant: 'destructive',
        });
      }
    });
  };

  const handleDeleteOverride = () => {
    const overrideId = editShiftModal.initialData?.overrideId;
    if (!overrideId) {
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.noOverrideData'),
        variant: 'destructive'
      });
      return;
    }

    setDeleteOverrideConfirm({
      open: true,
      overrideId,
      shiftName: editShiftModal.shiftName,
      shiftDate: editShiftModal.shiftDate,
      startTime: editShiftModal.initialData?.startTime,
      endTime: editShiftModal.initialData?.endTime,
    });
  };

  const confirmDeleteOverride = () => {
    const overrideId = deleteOverrideConfirm.overrideId;
    if (!overrideId) {
      setDeleteOverrideConfirm(prev => ({ ...prev, open: false }));
      return;
    }

    deleteOverrideMutation.mutate(overrideId, {
      onSuccess: async (data) => {
        toast({
          title: t('doctorCalendar.success'),
          description: data.message || t('doctorCalendar.shiftOverrideCanceled'),
        });
        setDeleteOverrideConfirm({ open: false, overrideId: undefined, shiftName: undefined, shiftDate: undefined, startTime: undefined, endTime: undefined });
        setEditShiftModal(prev => ({ ...prev, open: false }));
        await refreshCalendarData();
      },
      onError: () => {
        toast({
          title: t('doctorCalendar.error'),
          description: t('doctorCalendar.failedToCancelOverride'),
          variant: 'destructive'
        });
      }
    });
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

    deleteOverrideMutation.mutate(overrideData.overrideId, {
      onSuccess: async (data) => {
        toast({
          title: t('doctorCalendar.success'),
          description: data.message || t('doctorCalendar.shiftOverrideCanceled'),
        });
        setCancelOverrideModal({ open: false, overrideData: undefined });
        await refreshCalendarData();

        // TODO: Refetch calendar events here if needed
      },
      onError: (error) => {

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
      toast({
        title: t('doctorCalendar.error'),
        description: t('doctorCalendar.noOverrideData'),
        variant: "destructive",
      });
      return;
    }

    // Close the action dialog and open the dedicated cancel confirmation dialog
    setOverrideActionModal({ open: false, overrideData: undefined });
    setCancelOverrideModal({ open: true, overrideData });
  };

  const handleOverrideActionUpdate = () => {
    const overrideData = overrideActionModal.overrideData;

    if (!overrideData) {
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
        reason: null,
        overrideId: overrideData.overrideId
      }
    });
  };

  if (showRoster) {
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto p-6">
        <div className="max-w-4xl w-full mx-auto flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('doctorCalendar.roster.pageTitle', 'Doctor Availability')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('doctorCalendar.roster.pageSubtitle', "See who's available, and mark doctors unavailable when they're not.")}
            </p>
          </div>
          {onRequestClose && (
            <Button variant="ghost" size="icon" onClick={onRequestClose} className="shrink-0 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="max-w-4xl w-full mx-auto">
          {hospitalId ? (
            <AvailabilityRosterPage hospitalId={hospitalId} onSelectDoctor={handleSelectDoctorFromRoster} />
          ) : (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          )}
        </div>
      </div>
    );
  }

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

  if (isStaffScheduler && !hospitalDoctorsLoading && hospitalDoctors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('doctorCalendar.switcher.noDoctors', 'No doctors found')}
          </h3>
          <p className="text-gray-600">
            {t('doctorCalendar.switcher.noDoctorsMessage', 'This hospital has no doctors on record yet.')}
          </p>
        </div>
      </div>
    );
  }

  // For staff schedulers, "loading the doctor" means resolving the roster + selection;
  // for the self-service Doctor role it means resolving their own profile.
  const doctorResolutionLoading = isStaffScheduler ? (hospitalDoctorsLoading || !doctorId) : doctorProfileLoading;

  if (!doctorId || doctorResolutionLoading || isInitialLoading || configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {isInitialLoading ? t('doctorCalendar.initializingCalendar') : doctorResolutionLoading ? t('doctorCalendar.loadingDoctorProfile') : configLoading ? t('doctorCalendar.loadingCalendarConfig') : t('doctorCalendar.doctorProfileRequired')}
          </h3>
          <p className="text-gray-600">
            {isInitialLoading ? t('doctorCalendar.initializingMessage') : doctorResolutionLoading ? t('doctorCalendar.loadingProfileMessage') : configLoading ? t('doctorCalendar.loadingConfigMessage') : t('doctorCalendar.profileLoadError')}
          </p>
          {!isStaffScheduler && doctorProfileError && (
            <div className="text-red-600 text-sm mt-2">
              <p className="font-medium">{t('errors.doctorProfileError')}:</p>
              <p>{doctorProfileError.message || 'Failed to load doctor profile'}</p>
              <button
                onClick={() => {/* TODO: Refetch doctor profile or calendar data here if needed */ }}
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                {t('doctorCalendar.retry')}
              </button>
            </div>
          )}
          {(isInitialLoading || doctorResolutionLoading || configLoading) && (
            <div className="mt-4">
              <LoadingSpinner size="lg" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-all duration-300 overflow-hidden">
      {(isStaffScheduler || onRequestClose) && (
        <div className="pt-6 px-6 flex items-center justify-between">
          {isStaffScheduler ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToRoster}
              className="h-7 px-2 -ml-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('doctorCalendar.roster.backToRoster', 'Back to Availability')}
            </Button>
          ) : <span />}
          {onRequestClose && (
            <Button variant="ghost" size="icon" onClick={onRequestClose} className="h-7 w-7 rounded-full">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Premium Gamified Header */}
      <div className="pt-6 px-6">
        <GamifiedHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          view={view}
          onViewChange={setView}
          onAddOverride={handleAddOverride}
          doctorName={doctorName}
        />
      </div>



      {/* Main Content Area: Sidebar (mini-calendar + doctor switcher + legend), Calendar, Gamification panel */}
      <SubscriptionReadOnlyOverlay featureLabel="Managing your calendar" className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 h-full overflow-y-auto pb-6 custom-scrollbar">
            <CalendarSidebar
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              showDoctorSwitcher={isStaffScheduler}
              doctors={hospitalDoctors}
              selectedDoctorId={selectedStaffDoctor?.doctorId}
              onSelectDoctor={setSelectedStaffDoctor}
              doctorsLoading={hospitalDoctorsLoading}
            />
          </div>

          {/* Calendar Column */}
          <div className="lg:col-span-7 h-full flex flex-col">
            <AnimatePresence mode="wait">
              {eventsLoading || doctorResolutionLoading || isInitialLoading || configLoading ? (
                <motion.div
                  key="calendar-loading"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  className="flex-1 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                >
                  <div className="text-center p-8">
                    <LoadingSpinner size="lg" />
                    <h3 className="mt-6 text-base font-medium text-gray-700 dark:text-gray-300">
                      {isInitialLoading ? t('doctorCalendar.preparingCalendar') :
                        doctorResolutionLoading ? t('doctorCalendar.loadingProfile') :
                          configLoading ? t('doctorCalendar.loadingScheduleConfig') : t('doctorCalendar.loading')}
                    </h3>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="calendar-ready"
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden relative bg-white dark:bg-gray-900"
                >
                  <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-gray-900">
                    <FullCalendar
                      key="doctor-calendar-instance"
                      ref={calendarRef}
                      {...calendarOptions}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-2 space-y-6 h-full overflow-y-auto pb-6 custom-scrollbar pr-2">

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
      </SubscriptionReadOnlyOverlay>

      {/* Flat, minimal Google-Calendar-style theme for the FullCalendar grid */}
      <style>{`
          /* Smooth scrolling for the calendar content */
          .calendar-container {
            scroll-behavior: smooth;
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

          .fc-view {
            min-height: 500px;
            padding: 8px;
          }

          /* Flat day headers — thin border, no gradient */
          .fc-col-header {
            background: #ffffff !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          .fc-col-header-cell {
            padding: 8px 6px !important;
            font-weight: 500 !important;
            color: #6b7280 !important;
            text-transform: none !important;
            font-size: 0.72rem !important;
            letter-spacing: normal !important;
          }

          .fc-timegrid-axis {
            background: #ffffff !important;
            border-right: 1px solid #e5e7eb !important;
          }

          .fc-timegrid-slot-label {
            font-size: 0.7rem !important;
            color: #9ca3af !important;
            font-weight: 400 !important;
          }

          .fc-timegrid-slot {
            border-top: 1px solid #f1f5f9 !important;
          }

          .fc-timegrid-slot:nth-child(4n) {
            border-top: 1px solid #e5e7eb !important;
          }

          /* Current time indicator — a thin flat line, no glow */
          .fc-timegrid-now-indicator-line {
            border-color: #ea4335 !important;
            border-width: 1.5px !important;
          }

          .fc-timegrid-now-indicator-arrow {
            border-left-color: #ea4335 !important;
            border-width: 5px !important;
          }

          /* Today's date highlighting — flat tint, matches Google Calendar's own today color */
          .fc-day-today {
            background: #e8f0fe !important;
          }

          .fc-col-header-cell.fc-day-today {
            background: #ffffff !important;
            color: #1a73e8 !important;
            font-weight: 700 !important;
          }

          /* ── Event color system (flat fill + left accent bar, no gradients/glow) ── */

          .shift-event-default,
          .fc-bg-event.shift-background,
          .fc-bg-event[data-event-type="shift"] {
            background-color: #e8f0fe !important;
            border: none !important;
            border-left: 3px solid #1a73e8 !important;
            color: #1a4d99 !important;
          }

          .shift-event-override,
          .fc-event[data-override="true"] {
            background-color: #e6f4ea !important;
            border: none !important;
            border-left: 3px solid #188038 !important;
            color: #0f5c26 !important;
          }

          .block-event,
          .timeoff-event,
          .api-timeoff-event,
          .fc-event[data-event-type="timeoff"] {
            background-color: #fce8e6 !important;
            border: none !important;
            border-left: 3px solid #d93025 !important;
            color: #a50e0e !important;
            font-weight: 600 !important;
          }

          .appointment-event {
            background-color: #e8f0fe !important;
            border: none !important;
            border-left: 3px solid #1a73e8 !important;
            color: #1a4d99 !important;
            font-weight: 500 !important;
          }

          .fc-bg-event {
            opacity: 1 !important;
            pointer-events: none !important;
          }

          .full-width-harness {
            left: 0 !important;
            right: 0 !important;
            margin: 0 !important;
            z-index: 5 !important;
          }

          .full-width-harness .fc-event {
            width: 100% !important;
            margin: 0 !important;
          }

          /* Layering so time-off/override blocks always render above default shifts */
          .fc-event.block-event,
          .fc-event.timeoff-event,
          .fc-event.api-timeoff-event,
          .fc-event[data-event-type="block"],
          .fc-event[data-event-type="timeoff"] {
            z-index: 20 !important;
            position: relative !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            display: block !important;
            width: 100% !important;
            margin: 1px 0 !important;
          }

          .fc-event[data-override="true"] {
            z-index: 10 !important;
            position: relative !important;
            cursor: pointer !important;
            pointer-events: auto !important;
          }

          .fc-event[data-override="true"] .cancel-override-btn {
            z-index: 30 !important;
          }

          /* Flat event chip — small radius, no shadow/blur at rest */
          .fc-event {
            cursor: pointer;
            border-radius: 4px !important;
            margin: 1px 0 !important;
            box-shadow: none !important;
            transition: background-color 0.15s ease, box-shadow 0.15s ease !important;
          }

          /* Subtle hover — a light shadow only, no lift/scale */
          .fc-event:hover {
            box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3) !important;
            z-index: 100 !important;
          }

          .fc-event-main {
            padding: 2px 6px !important;
          }

          .fc-event-title {
            font-weight: 500 !important;
            font-size: 0.72rem !important;
            line-height: 1.3 !important;
          }

          .fc-daygrid-event {
            font-size: 0.68rem !important;
            padding: 1px 4px !important;
          }

          .fc-timegrid-event {
            font-size: 0.68rem !important;
            padding: 1px 4px !important;
          }

          /* Time-off event content layout */
          .timeoff-event-content {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 4px !important;
          }

          .override-event-content {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
          }

          /* Flat cancel buttons — subtle darken on hover, no scale/shadow pop */
          .cancel-timeoff-btn {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 1px solid #d93025 !important;
            border-radius: 50% !important;
            width: 16px !important;
            height: 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            color: #d93025 !important;
            font-size: 8px !important;
            transition: background-color 0.15s ease !important;
            flex-shrink: 0 !important;
          }

          .cancel-timeoff-btn:hover {
            background: #d93025 !important;
            color: white !important;
          }

          .cancel-override-btn {
            position: absolute !important;
            top: -8px !important;
            right: -8px !important;
            background: #d93025 !important;
            color: white !important;
            border-radius: 50% !important;
            width: 18px !important;
            height: 18px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 1000 !important;
            transition: background-color 0.15s ease !important;
            border: none !important;
            padding: 0 !important;
            outline: none !important;
            pointer-events: auto !important;
          }

          .cancel-override-btn:hover {
            background: #a50e0e !important;
          }

          .cancel-override-btn:focus {
            outline: 2px solid #d93025 !important;
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
        onDelete={editShiftModal.initialData?.overrideId ? handleDeleteOverride : undefined}
        isLoading={createOverrideMutation.isPending || deleteOverrideMutation.isPending}
      />



      <PersonalizedScheduleModal
        open={personalizedScheduleModal.open}
        onOpenChange={(open) => {
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
        existingTimeOffs={existingTimeOffData?.timeOffs}
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
              {t('doctorCalendar.successDialog.continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOverrideConfirm.open} onOpenChange={(open) => setDeleteOverrideConfirm(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('doctorCalendar.confirmDeleteOverride', 'Delete override shift?')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <p>{t('doctorCalendar.confirmDeleteOverrideMessage', 'This will remove the override and revert to your default schedule for:')}</p>
            <ul className="text-sm list-disc pl-5">
              <li>{deleteOverrideConfirm.shiftName || t('doctorCalendar.shiftDetails.untitledShift')}</li>
              <li>{deleteOverrideConfirm.shiftDate}</li>
              {deleteOverrideConfirm.startTime && deleteOverrideConfirm.endTime && (
                <li>{`${deleteOverrideConfirm.startTime} – ${deleteOverrideConfirm.endTime}`}</li>
              )}
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('doctorCalendar.deleteOverrideIrreversible', 'This action cannot be undone.')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOverrideConfirm(prev => ({ ...prev, open: false }))}>
              {t('doctorCalendar.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteOverride} disabled={deleteOverrideMutation.isPending}>
              {deleteOverrideMutation.isPending ? t('doctorCalendar.deleting', 'Deleting...') : t('doctorCalendar.deleteOverride', 'Delete override')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
