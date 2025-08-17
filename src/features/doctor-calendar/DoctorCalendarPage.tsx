import React, { useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarHeader } from './components/CalendarHeader';
import { Legend } from './components/Legend';
import { EditShiftModal } from './components/EditShiftModal';
import { PersonalizedScheduleModal } from './components/PersonalizedScheduleModal';
import { useCalendarEvents, useCreateOverride, useDeleteOverride, useCreateBlock, useDeleteBlock } from './hooks/useCalendar';
import { CalendarEvent, CreateOverridePayload, CreateBlockPayload, ShiftName } from './api/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { Button } from '@/components/ui/button';
import { X, Calendar, Clock, MousePointer } from 'lucide-react';

export const DoctorCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
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
  
  const { toast } = useToast();
  const { getUserId } = useAuthStore();
  const doctorId = getUserId() || '';
  const { data: userDetailsResponse } = useUserDetails(doctorId);
  
  // Get doctor name
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
  
  // Queries
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(doctorId, fromISO, toISO);
  
  // Mutations
  const createOverrideMutation = useCreateOverride();
  const deleteOverrideMutation = useDeleteOverride();
  const createBlockMutation = useCreateBlock();
  const deleteBlockMutation = useDeleteBlock();
  
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
  
  // Calendar event handlers
  const handleEventClick = useCallback((info: any) => {
    const event = info.event;
    const eventType = event.extendedProps?.type;
    
    if (eventType === 'shift') {
      // Open EditShiftModal for shift events
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
      // Show appointment details
      toast({
        title: "Appointment Details",
        description: `Patient: ${event.extendedProps?.patientName}, Token: ${event.extendedProps?.tokenNumber}`,
      });
         } else if (eventType === 'block') {
       // Show time off details
       toast({
         title: "Time Off Details",
         description: `${event.title}`,
       });
     }
  }, [toast]);
  
     const handleDateSelect = useCallback((selectInfo: any) => {
     // Open PersonalizedScheduleModal with time off functionality for date selection
     setPersonalizedScheduleModal({
       open: true,
       initialDate: undefined,
       initialStartDateTime: selectInfo.start.toISOString(),
       initialEndDateTime: selectInfo.end.toISOString()
     });
   }, []);
  
  const handleEventDrop = useCallback((dropInfo: any) => {
    // Handle event drag and drop
    toast({
      title: "Event Moved",
      description: `${dropInfo.event.title} moved to ${format(dropInfo.event.start!, 'MMM dd, yyyy')}`,
    });
  }, [toast]);
  
  const handleEventResize = useCallback((resizeInfo: any) => {
    // Handle event resize
    toast({
      title: "Event Resized",
      description: `${resizeInfo.event.title} resized`,
    });
  }, [toast]);
  
     // Calendar configuration
   const calendarOptions = {
     plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
     initialView: view,
     initialDate: currentDate,
     headerToolbar: false as const, // We're using our custom header
     height: 'auto',
     selectable: true,
     selectMirror: true,
     dayMaxEvents: true,
     weekends: true,
     firstDay: 1, // Monday
     timezone: 'local',
     slotDuration: '00:15:00',
     selectOverlap: () => true,
     eventOrder: 'blocks,appointments,shifts',
     events: events,
     eventClick: handleEventClick,
     select: handleDateSelect,
     eventDrop: handleEventDrop,
     eventResize: handleEventResize,
    eventContent: (arg: any) => {
      const eventType = arg.event.extendedProps?.type;
      
      if (eventType === 'shift') {
        return {
          html: `
            <div class="fc-event-main-content">
              <div class="text-xs font-medium">${arg.event.title}</div>
            </div>
          `
        };
      } else if (eventType === 'appointment') {
        return {
          html: `
            <div class="fc-event-main-content">
              <div class="text-xs font-bold">${arg.event.extendedProps?.tokenNumber}</div>
              <div class="text-xs">${arg.event.extendedProps?.patientName}</div>
            </div>
          `
        };
      } else if (eventType === 'block') {
        return {
          html: `
            <div class="fc-event-main-content">
              <div class="text-xs font-medium">${arg.event.title}</div>
            </div>
          `
        };
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
      
      const classes = [];
      
      if (eventType === 'shift') {
        classes.push('shift-event');
        if (shiftName === 'Morning') classes.push('shift-morning');
        else if (shiftName === 'Afternoon') classes.push('shift-afternoon');
        else if (shiftName === 'Evening') classes.push('shift-evening');
        else if (shiftName === 'Night') classes.push('shift-night');
             } else if (eventType === 'block') {
         classes.push('block-event', 'timeoff-event');
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
  

  
  // Modal handlers
  const handleSaveOverride = (payload: CreateOverridePayload) => {
    createOverrideMutation.mutate(payload, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Shift override saved successfully",
        });
        setEditShiftModal(prev => ({ ...prev, open: false }));
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to save shift override",
          variant: "destructive",
        });
      }
    });
  };

  const handleSavePersonalizedSchedule = (payloads: CreateOverridePayload[]) => {
    // Save multiple overrides for personalized schedule
    Promise.all(payloads.map(payload => 
      new Promise((resolve, reject) => {
        createOverrideMutation.mutate(payload, {
          onSuccess: () => resolve(payload),
          onError: (error) => reject(error)
        });
      })
    )).then(() => {
      toast({
        title: "Success",
        description: `Personalized schedule saved successfully (${payloads.length} shifts)`,
      });
      setPersonalizedScheduleModal(prev => ({ ...prev, open: false }));
    }).catch((error) => {
      toast({
        title: "Error",
        description: "Failed to save personalized schedule",
        variant: "destructive",
      });
    });
  };

     const handleSaveBlockFromPersonalized = (payload: CreateBlockPayload) => {
     createBlockMutation.mutate(payload, {
       onSuccess: () => {
         toast({
           title: "Success",
           description: "Time off scheduled successfully",
         });
         setPersonalizedScheduleModal(prev => ({ ...prev, open: false }));
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
    // Find the override ID from the existing overrides
    const overrideId = `o_${doctorId}_${editShiftModal.shiftDate}_${editShiftModal.shiftName}`;
    
    deleteOverrideMutation.mutate(overrideId, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Shift override deleted successfully",
        });
        setEditShiftModal(prev => ({ ...prev, open: false }));
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to delete shift override",
          variant: "destructive",
        });
      }
    });
  };
  

  
  if (!doctorId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Authentication Required</h3>
          <p className="text-gray-600">Please log in to view your calendar.</p>
        </div>
      </div>
    );
  }
  
           return (
      <div className="h-full bg-gray-50">
        <div className="flex flex-col">
         {/* Header */}
                   <CalendarHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            view={view}
            onViewChange={setView}
            onAddOverride={handleAddOverride}
          />
         
         {/* Welcome Banner */}
         {showWelcomeBanner && (
           <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-4">
             <div className="flex items-start justify-between">
               <div className="flex-1">
                 <h2 className="text-lg font-semibold text-gray-900 mb-2">
                   Welcome, Dr. {doctorName}! 👋
                 </h2>
                 <p className="text-sm text-gray-700 mb-3">
                   Manage your schedule and appointments efficiently with your personalized calendar.
                 </p>
                 <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                   <div className="flex items-center gap-1">
                     <MousePointer className="h-3 w-3" />
                     <span>Click events to view details</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <Calendar className="h-3 w-3" />
                     <span>Switch between Month/Week/Day views</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     <span>Add schedules and time off as needed</span>
                   </div>
                 </div>
               </div>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setShowWelcomeBanner(false)}
                 className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
               >
                 <X className="h-4 w-4" />
               </Button>
             </div>
           </div>
         )}
         
         {/* Legend */}
         <div className="px-4 py-2">
           <Legend />
         </div>
         
         {/* Calendar */}
         <div className="flex-1 p-4">
           {eventsLoading ? (
             <div className="flex items-center justify-center h-64">
               <LoadingSpinner size="lg" />
             </div>
           ) : (
                           <div className="bg-white rounded-lg shadow-sm border">
                <FullCalendar
                  key={`${view}-${currentDate.toISOString()}`}
                  ref={calendarRef}
                  {...calendarOptions}
                />
              </div>
           )}
         </div>
               </div>
      
                    {/* Custom CSS for event styling */}
                <style>{`
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
             background-color: #ef4444 !important;
             border-color: #dc2626 !important;
             color: white !important;
             font-weight: 600 !important;
           }
          
          .appointment-event {
            background-color: #3b82f6 !important;
            border-color: #2563eb !important;
            color: white !important;
            font-weight: 600 !important;
          }
          
          .fc-event {
            cursor: pointer;
            border-radius: 4px !important;
            margin: 1px 0 !important;
          }
          
          .fc-event:hover {
            opacity: 0.9 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            transition: all 0.2s ease !important;
          }
          
          /* Make shift events more prominent in month view */
          .fc-daygrid-event {
            font-size: 0.75rem !important;
            padding: 2px 4px !important;
          }
          
          /* Style for time grid events (week/day view) */
          .fc-timegrid-event {
            font-size: 0.75rem !important;
            padding: 2px 4px !important;
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
          onOpenChange={(open) => setPersonalizedScheduleModal(prev => ({ ...prev, open }))}
          doctorId={doctorId}
          initialDate={personalizedScheduleModal.initialDate}
          initialStartDateTime={personalizedScheduleModal.initialStartDateTime}
          initialEndDateTime={personalizedScheduleModal.initialEndDateTime}
          onSave={handleSavePersonalizedSchedule}
          onSaveBlock={handleSaveBlockFromPersonalized}
          isLoading={createOverrideMutation.isPending || createBlockMutation.isPending}
        />
     </div>
   );
 };
