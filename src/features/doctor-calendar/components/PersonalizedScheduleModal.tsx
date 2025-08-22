import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShiftName, CreateOverridePayload, BlockType, CreateBlockPayload } from '../api/types';
import { format, parseISO, addDays, addWeeks, addMonths } from 'date-fns';
import { Clock, Calendar, Repeat, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { CalendarService, CalendarViewType, DateRange } from '../services/calendarService';
import { DateRangeSelectionPopup } from './DateRangeSelectionPopup';

interface PersonalizedScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  initialDate?: string;
  initialStartDateTime?: string;
  initialEndDateTime?: string;
  viewType?: CalendarViewType;
  selectedDate?: Date;
  onSave: (payloads: CreateOverridePayload[]) => void;
  onSaveBlock?: (payload: CreateBlockPayload) => void;
  isLoading?: boolean;
}

interface ShiftTemplate {
  name: ShiftName;
  icon: React.ReactNode;
  defaultStartTime: string;
  defaultEndTime: string;
  color: string;
  description: string;
}

const SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    name: 'Morning',
    icon: <Sunrise className="h-4 w-4" />,
    defaultStartTime: '09:00',
    defaultEndTime: '12:00',
    color: 'bg-teal-50 border-teal-200 text-teal-800',
    description: 'Morning OPD Hours'
  },
  {
    name: 'Afternoon',
    icon: <Sun className="h-4 w-4" />,
    defaultStartTime: '14:00',
    defaultEndTime: '17:00',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    description: 'Afternoon OPD Hours'
  },
  {
    name: 'Evening',
    icon: <Sunset className="h-4 w-4" />,
    defaultStartTime: '18:00',
    defaultEndTime: '21:00',
    color: 'bg-violet-50 border-violet-200 text-violet-800',
    description: 'Evening OPD Hours'
  },
  {
    name: 'Night',
    icon: <Moon className="h-4 w-4" />,
    defaultStartTime: '22:00',
    defaultEndTime: '06:00',
    color: 'bg-slate-50 border-slate-200 text-slate-800',
    description: 'Night Emergency Hours'
  }
];

export const PersonalizedScheduleModal: React.FC<PersonalizedScheduleModalProps> = ({
  open,
  onOpenChange,
  doctorId,
  initialDate,
  initialStartDateTime,
  initialEndDateTime,
  viewType = 'month',
  selectedDate = new Date(),
  onSave,
  onSaveBlock,
  isLoading = false
}) => {
  const [selectedShifts, setSelectedShifts] = useState<Set<ShiftName>>(new Set());
       const [shiftConfigs, setShiftConfigs] = useState<Record<ShiftName, {
    startTime: string;
    endTime: string;
    slotDuration: number;
    maxPatients: string;
    enabled: boolean;
  }>>({
    Morning: { startTime: '09:00', endTime: '12:00', slotDuration: 15, maxPatients: '', enabled: false },
    Afternoon: { startTime: '14:00', endTime: '17:00', slotDuration: 15, maxPatients: '', enabled: false },
    Evening: { startTime: '18:00', endTime: '21:00', slotDuration: 15, maxPatients: '', enabled: false },
    Night: { startTime: '22:00', endTime: '06:00', slotDuration: 15, maxPatients: '', enabled: false }
  });

                 const [scheduleType, setScheduleType] = useState<'schedule' | 'block'>(
    initialStartDateTime && initialEndDateTime ? 'block' : 'schedule'
  );
  const [startDate, setStartDate] = useState(initialDate || '');
  const [endDate, setEndDate] = useState(initialDate || '');
  
  // Date range selection state
  const [showDateRangePopup, setShowDateRangePopup] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
     const [scheduleMode, setScheduleMode] = useState<'single' | 'recurring'>('single');
   const [recurringDays, setRecurringDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5])); // Mon-Fri
   const [recurringEndDate, setRecurringEndDate] = useState('');

     // Block form state
     const [blockFormData, setBlockFormData] = useState({
    blockType: 'Personal' as BlockType,
    startDateTime: '',
    endDateTime: ''
  });

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPayloads, setPendingPayloads] = useState<CreateOverridePayload[]>([]);
  const [pendingBlockPayload, setPendingBlockPayload] = useState<CreateBlockPayload | null>(null);

  // Initialize dates and block form data
  useEffect(() => {
    // Only initialize when modal is open
    if (!open) return;
    
    // Initialize start and end dates if not set
    if (!startDate) {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      setStartDate(initialDate || tomorrow);
    }
    
    if (!endDate) {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      setEndDate(initialDate || tomorrow);
    }
    
    if (!recurringEndDate) {
      const fourWeeksLater = format(addWeeks(new Date(), 4), 'yyyy-MM-dd');
      setRecurringEndDate(fourWeeksLater);
    }
    
    // Initialize block form data
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    if (initialStartDateTime && initialEndDateTime) {
      try {
        const startDateTime = format(new Date(initialStartDateTime), "yyyy-MM-dd'T'HH:mm");
        const endDateTime = format(new Date(initialEndDateTime), "yyyy-MM-dd'T'HH:mm");
        
        setBlockFormData(prev => ({
          ...prev,
          startDateTime,
          endDateTime
        }));
      } catch (error) {
        // Fallback to defaults if parsing fails
        setBlockFormData(prev => ({
          ...prev,
          startDateTime: `${today}T09:00`,
          endDateTime: `${today}T17:00`
        }));
      }
    } else {
      // Use more user-friendly defaults (10:30 AM - 11:00 AM as shown in the image)
      const startDateTime = `${today}T10:30`;
      const endDateTime = `${today}T11:00`;
      
      setBlockFormData(prev => ({
        ...prev,
        startDateTime,
        endDateTime
      }));
    }
  }, [open, initialDate, initialStartDateTime, initialEndDateTime]);

  const handleShiftToggle = (shiftName: ShiftName) => {
    const newSelected = new Set(selectedShifts);
    if (newSelected.has(shiftName)) {
      newSelected.delete(shiftName);
    } else {
      newSelected.add(shiftName);
    }
    setSelectedShifts(newSelected);

    // Update enabled state
    setShiftConfigs(prev => ({
      ...prev,
      [shiftName]: {
        ...prev[shiftName],
        enabled: newSelected.has(shiftName)
      }
    }));
  };

  const handleShiftConfigChange = (shiftName: ShiftName, field: string, value: string | number) => {
    setShiftConfigs(prev => ({
      ...prev,
      [shiftName]: {
        ...prev[shiftName],
        [field]: value
      }
    }));
  };

  const handleDayToggle = (dayIndex: number) => {
    const newDays = new Set(recurringDays);
    if (newDays.has(dayIndex)) {
      newDays.delete(dayIndex);
    } else {
      newDays.add(dayIndex);
    }
    setRecurringDays(newDays);
  };

  // Handle date range selection
  const handleDateRangeSelect = () => {
    setShowDateRangePopup(true);
  };

  const handleDateRangeConfirm = (dateRange: DateRange) => {
    setSelectedDateRange(dateRange);
    setStartDate(format(dateRange.startDate, 'yyyy-MM-dd'));
    setEndDate(format(dateRange.endDate, 'yyyy-MM-dd'));
    setShowDateRangePopup(false);
  };

    const handleDateRangeCancel = () => {
    setShowDateRangePopup(false);
  };

  // Confirmation handlers
  const handleConfirmSave = () => {
    setShowConfirmation(false);
    
    if (pendingPayloads.length > 0) {
      onSave(pendingPayloads);
      setPendingPayloads([]);
    } else if (pendingBlockPayload) {
      if (onSaveBlock) {
        onSaveBlock(pendingBlockPayload);
      }
      setPendingBlockPayload(null);
    }
  };

  const handleCancelSave = () => {
    setShowConfirmation(false);
    setPendingPayloads([]);
    setPendingBlockPayload(null);
  };



  const generatePayloads = (): CreateOverridePayload[] => {
       const payloads: CreateOverridePayload[] = [];
       
       // Convert recurring days to abbreviated day names for database
       const getDayAbbreviation = (dayNumber: number): string => {
         const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
         return dayAbbreviations[dayNumber === 0 ? 0 : dayNumber - 1];
       };
       
       const recurringDayAbbreviations = Array.from(recurringDays).map(day => getDayAbbreviation(day));
       const recurringDaysString = recurringDayAbbreviations.length > 0 ? recurringDayAbbreviations.join(',') : null;
       
       if (scheduleMode === 'single') {
         // Single day schedule - one payload per shift
         selectedShifts.forEach(shiftName => {
           const config = shiftConfigs[shiftName];
           if (config.enabled) {
             payloads.push({
               doctorId,
               shiftName,
               startTime: `${config.startTime}:00`, // Convert to TIME format
               endTime: `${config.endTime}:00`,     // Convert to TIME format
               slotDurationInMinutes: config.slotDuration,
               recurringDays: null,
               overrideDate: startDate, // DATE format "YYYY-MM-DD"
               startDate: null,
               endDate: null,
               maxPatients: config.maxPatients ? parseInt(config.maxPatients) : null,
               reason: `Personalized ${shiftName} Schedule`
             });
           }
         });
       } else {
         // Recurring schedule - one payload per shift with recurring days
         selectedShifts.forEach(shiftName => {
           const config = shiftConfigs[shiftName];
           if (config.enabled) {
             payloads.push({
               doctorId,
               shiftName,
               startTime: `${config.startTime}:00`, // Convert to TIME format
               endTime: `${config.endTime}:00`,     // Convert to TIME format
               slotDurationInMinutes: config.slotDuration,
               recurringDays: recurringDaysString, // "Mon,Wed,Fri"
               overrideDate: null,
               startDate: startDate,        // DATE format "YYYY-MM-DD"
               endDate: recurringEndDate,   // DATE format "YYYY-MM-DD"
               maxPatients: config.maxPatients ? parseInt(config.maxPatients) : null,
               reason: `Recurring ${shiftName} Schedule`
             });
           }
         });
       }

       return payloads;
     };

     const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     
     // Enhanced validation
     if (selectedShifts.size === 0) {
       return; // No shifts selected
     }

     // Validate recurring schedule settings
     if (scheduleMode === 'recurring') {
       if (recurringDays.size === 0) {
         return; // No days selected for recurring schedule
       }
       
       const start = parseISO(startDate);
       const end = parseISO(recurringEndDate);
       if (start >= end) {
         return; // End date must be after start date
       }
     }

     // Validate shift configurations
     const hasValidConfigs = Array.from(selectedShifts).every(shiftName => {
       const config = shiftConfigs[shiftName];
       if (!config.enabled) return false;
       
       const startTime = config.startTime;
       const endTime = config.endTime;
       
       // Basic time validation
       if (!startTime || !endTime) return false;
       
       // Convert to minutes for comparison
       const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
       const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
       
       return startMinutes < endMinutes;
     });

     if (!hasValidConfigs) {
       return; // Invalid shift configurations
     }

         const payloads = generatePayloads();
    if (payloads.length > 0) {
      setPendingPayloads(payloads);
      setShowConfirmation(true);
    }
   };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!onSaveBlock) return;
    
    try {
      // Generate a title based on block type and date
      const startDate = new Date(blockFormData.startDateTime);
      const endDate = new Date(blockFormData.endDateTime);
      
      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid dates provided:', blockFormData);
        return;
      }
      
      const generatedTitle = `${blockFormData.blockType} - ${format(startDate, 'MMM dd, yyyy')}`;
      
      const payload: CreateBlockPayload = {
        doctorId,
        title: generatedTitle,
        blockType: blockFormData.blockType,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString()
      };
      
      setPendingBlockPayload(payload);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error creating time-off payload:', error);
    }
  };

         const isBlockFormValid = () => {
    // Check if required fields are filled
    if (!blockFormData.startDateTime || !blockFormData.endDateTime) {
      return false;
    }
    
    const start = new Date(blockFormData.startDateTime);
    const end = new Date(blockFormData.endDateTime);
    const now = new Date();
    
    // Ensure valid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    // Allow same-day bookings (start <= end)
    if (start > end) {
      return false;
    }
    
    // Prevent booking in the past (start time should be at least current time)
    // Allow a 10-minute buffer to account for form interaction time and timezone issues
    const bufferTime = new Date(now.getTime() - 10 * 60 * 1000);
    if (start < bufferTime) {
      return false;
    }
    
    return true;
  };

   const isScheduleFormValid = () => {
     if (selectedShifts.size === 0) return false;

     // Validate recurring schedule settings
     if (scheduleMode === 'recurring') {
       if (recurringDays.size === 0) return false;
       
       const start = parseISO(startDate);
       const end = parseISO(recurringEndDate);
       if (start >= end) return false;
     }

     // Validate shift configurations
     return Array.from(selectedShifts).every(shiftName => {
       const config = shiftConfigs[shiftName];
       if (!config.enabled) return false;
       
       const startTime = config.startTime;
       const endTime = config.endTime;
       
       if (!startTime || !endTime) return false;
       
       const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
       const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
       
       return startMinutes < endMinutes;
     });
   };

     const getBlockTypeColor = (blockType: BlockType) => {
     switch (blockType) {
       case 'Annual Leave': return 'text-red-600';
       case 'Sick Leave': return 'text-orange-600';
       case 'Personal': return 'text-purple-600';
       case 'Conference': return 'text-blue-600';
       case 'Training': return 'text-green-600';
       case 'Meeting': return 'text-indigo-600';
       case 'Emergency': return 'text-pink-600';
       case 'Other': return 'text-gray-600';
       default: return 'text-gray-600';
     }
   };

     const formatDate = (dateStr: string) => {
     try {
       const date = parseISO(dateStr);
       return format(date, 'EEEE, MMMM d, yyyy');
     } catch (error) {
       return dateStr;
     }
   };

     // Get minimum allowed date (today)
  const getMinDate = () => {
    return format(new Date(), 'yyyy-MM-dd');
  };

   

  const DAYS = [
    { index: 1, name: 'Monday', short: 'Mon' },
    { index: 2, name: 'Tuesday', short: 'Tue' },
    { index: 3, name: 'Wednesday', short: 'Wed' },
    { index: 4, name: 'Thursday', short: 'Thu' },
    { index: 5, name: 'Friday', short: 'Fri' },
    { index: 6, name: 'Saturday', short: 'Sat' },
    { index: 7, name: 'Sunday', short: 'Sun' }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Personalized Schedule Configuration
          </DialogTitle>
        </DialogHeader>
        
                 <form onSubmit={scheduleType === 'block' ? handleBlockSubmit : handleSubmit} className="space-y-6">
           {/* Schedule Type Selection */}
           <div className="space-y-3">
             <Label className="text-base font-semibold">Configuration Type</Label>
                           <Tabs value={scheduleType} onValueChange={(value) => setScheduleType(value as 'schedule' | 'block')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="schedule">Schedule Management</TabsTrigger>
                  <TabsTrigger value="block">Time Off</TabsTrigger>
                </TabsList>
              
                                             <TabsContent value="schedule" className="space-y-4">
                  {/* Schedule Mode Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Schedule Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={scheduleMode === 'single' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setScheduleMode('single')}
                        className="flex-1"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Single Day
                      </Button>
                      <Button
                        type="button"
                        variant={scheduleMode === 'recurring' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setScheduleMode('recurring')}
                        className="flex-1"
                      >
                        <Repeat className="h-4 w-4 mr-2" />
                        Recurring
                      </Button>
                    </div>
                  </div>

                  {/* Date Configuration */}
                  {scheduleMode === 'single' ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="startDate">Schedule Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          min={getMinDate()}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Schedule for: {formatDate(startDate)}
                      </p>
                      <p className="text-xs text-amber-600">
                        ⚠️ Only future dates are allowed (tomorrow and onwards)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="recurringStartDate">Start Date</Label>
                          <Input
                            id="recurringStartDate"
                            type="date"
                            value={startDate}
                            min={getMinDate()}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="recurringEndDate">End Date</Label>
                          <Input
                            id="recurringEndDate"
                            type="date"
                            value={recurringEndDate}
                            min={startDate}
                            onChange={(e) => setRecurringEndDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <p className="text-xs text-amber-600">
                        ⚠️ Start date must be tomorrow or later. End date must be after start date.
                      </p>
                      
                      <div>
                        <Label className="text-sm font-medium">Recurring Days</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {DAYS.map(day => (
                            <Button
                              key={day.index}
                              type="button"
                              variant={recurringDays.has(day.index) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleDayToggle(day.index)}
                              className="h-8 px-3"
                            >
                              {day.short}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              
                             

                                               <TabsContent value="block" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="blockType">Type of Time Off</Label>
                   <Select
                     value={blockFormData.blockType}
                     onValueChange={(value: BlockType) => setBlockFormData(prev => ({ ...prev, blockType: value }))}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                                           <SelectContent>
                        <SelectItem value="Annual Leave" className={getBlockTypeColor('Annual Leave')}>
                          Annual Leave
                        </SelectItem>
                        <SelectItem value="Sick Leave" className={getBlockTypeColor('Sick Leave')}>
                          Sick Leave
                        </SelectItem>
                        <SelectItem value="Personal" className={getBlockTypeColor('Personal')}>
                          Personal
                        </SelectItem>
                        <SelectItem value="Conference" className={getBlockTypeColor('Conference')}>
                          Conference
                        </SelectItem>
                        <SelectItem value="Training" className={getBlockTypeColor('Training')}>
                          Training
                        </SelectItem>
                        <SelectItem value="Meeting" className={getBlockTypeColor('Meeting')}>
                          Meeting
                        </SelectItem>
                        <SelectItem value="Emergency" className={getBlockTypeColor('Emergency')}>
                          Emergency
                        </SelectItem>
                        <SelectItem value="Other" className={getBlockTypeColor('Other')}>
                          Other
                        </SelectItem>
                      </SelectContent>
                   </Select>
                 </div>
                 
                                   <div className="space-y-4">
                    {/* Start Date & Time */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Start Date & Time</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="blockStartDate" className="text-xs text-muted-foreground">Date</Label>
                          <Input
                            id="blockStartDate"
                            type="date"
                            value={blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : ''}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const date = e.target.value;
                              const time = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[1] : '09:00';
                              setBlockFormData(prev => ({ 
                                ...prev, 
                                startDateTime: `${date}T${time}` 
                              }));
                            }}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="blockStartTime" className="text-xs text-muted-foreground">Time</Label>
                          <div className="flex gap-1">
                            <Select
                              value={blockFormData.startDateTime ? 
                                (() => {
                                  const time = blockFormData.startDateTime.split('T')[1];
                                  const [hours, minutes] = time.split(':');
                                  const hour12 = parseInt(hours) % 12 || 12;
                                  return `${hour12.toString().padStart(2, '0')}:${minutes}`;
                                })() : '10:30'
                              }
                              onValueChange={(value) => {
                                const date = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                                const currentTime = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[1] : '10:30';
                                const [, minutes] = currentTime.split(':');
                                const currentHour = parseInt(currentTime.split(':')[0]);
                                const isCurrentlyPM = currentHour >= 12;
                                
                                const [hour12, newMinutes] = value.split(':');
                                let hour24 = parseInt(hour12);
                                if (isCurrentlyPM && hour24 !== 12) hour24 += 12;
                                if (!isCurrentlyPM && hour24 === 12) hour24 = 0;
                                
                                const time24 = `${hour24.toString().padStart(2, '0')}:${newMinutes}`;
                                setBlockFormData(prev => ({ 
                                  ...prev, 
                                  startDateTime: `${date}T${time24}` 
                                }));
                              }}
                            >
                              <SelectTrigger className="w-20 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 48 }, (_, i) => {
                                  const totalMinutes = i * 30;
                                  const hours = Math.floor(totalMinutes / 60);
                                  const minutes = totalMinutes % 60;
                                  const hour12 = hours % 12 || 12;
                                  return (
                                    <SelectItem key={i} value={`${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}>
                                      {hour12}:{minutes.toString().padStart(2, '0')}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <Select
                              value={blockFormData.startDateTime ? 
                                (parseInt(blockFormData.startDateTime.split('T')[1].split(':')[0]) >= 12 ? 'PM' : 'AM') : 'AM'
                              }
                              onValueChange={(value) => {
                                const date = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                                const currentTime = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[1] : '10:30';
                                const [hours, minutes] = currentTime.split(':');
                                let hour24 = parseInt(hours);
                                
                                if (value === 'PM' && hour24 < 12) {
                                  hour24 += 12;
                                } else if (value === 'AM' && hour24 >= 12) {
                                  hour24 -= 12;
                                }
                                
                                const time24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;
                                setBlockFormData(prev => ({ 
                                  ...prev, 
                                  startDateTime: `${date}T${time24}` 
                                }));
                              }}
                            >
                              <SelectTrigger className="w-16 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* End Date & Time */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">End Date & Time</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="blockEndDate" className="text-xs text-muted-foreground">Date</Label>
                          <Input
                            id="blockEndDate"
                            type="date"
                            value={blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[0] : ''}
                            min={blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const date = e.target.value;
                              const time = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[1] : '17:00';
                              setBlockFormData(prev => ({ 
                                ...prev, 
                                endDateTime: `${date}T${time}` 
                              }));
                            }}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="blockEndTime" className="text-xs text-muted-foreground">Time</Label>
                          <div className="flex gap-1">
                            <Select
                              value={blockFormData.endDateTime ? 
                                (() => {
                                  const time = blockFormData.endDateTime.split('T')[1];
                                  const [hours, minutes] = time.split(':');
                                  const hour12 = parseInt(hours) % 12 || 12;
                                  return `${hour12.toString().padStart(2, '0')}:${minutes}`;
                                })() : '11:00'
                              }
                              onValueChange={(value) => {
                                const date = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                                const currentTime = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[1] : '17:00';
                                const [, minutes] = currentTime.split(':');
                                const currentHour = parseInt(currentTime.split(':')[0]);
                                const isCurrentlyPM = currentHour >= 12;
                                
                                const [hour12, newMinutes] = value.split(':');
                                let hour24 = parseInt(hour12);
                                if (isCurrentlyPM && hour24 !== 12) hour24 += 12;
                                if (!isCurrentlyPM && hour24 === 12) hour24 = 0;
                                
                                const time24 = `${hour24.toString().padStart(2, '0')}:${newMinutes}`;
                                setBlockFormData(prev => ({ 
                                  ...prev, 
                                  endDateTime: `${date}T${time24}` 
                                }));
                              }}
                            >
                              <SelectTrigger className="w-20 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 48 }, (_, i) => {
                                  const totalMinutes = i * 30;
                                  const hours = Math.floor(totalMinutes / 60);
                                  const minutes = totalMinutes % 60;
                                  const hour12 = hours % 12 || 12;
                                  return (
                                    <SelectItem key={i} value={`${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}>
                                      {hour12}:{minutes.toString().padStart(2, '0')}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <Select
                              value={blockFormData.endDateTime ? 
                                (parseInt(blockFormData.endDateTime.split('T')[1].split(':')[0]) >= 12 ? 'PM' : 'AM') : 'AM'
                              }
                              onValueChange={(value) => {
                                const date = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                                const currentTime = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[1] : '17:00';
                                const [hours, minutes] = currentTime.split(':');
                                let hour24 = parseInt(hours);
                                
                                if (value === 'PM' && hour24 < 12) {
                                  hour24 += 12;
                                } else if (value === 'AM' && hour24 >= 12) {
                                  hour24 -= 12;
                                }
                                
                                const time24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;
                                setBlockFormData(prev => ({ 
                                  ...prev, 
                                  endDateTime: `${date}T${time24}` 
                                }));
                              }}
                            >
                              <SelectTrigger className="w-16 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Time Presets */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Time Presets</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const date = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                            setBlockFormData(prev => ({ 
                              ...prev, 
                              startDateTime: `${date}T09:00`,
                              endDateTime: `${date}T17:00`
                            }));
                          }}
                          className="text-xs"
                        >
                          Full Day (9 AM - 5 PM)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const date = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                            setBlockFormData(prev => ({ 
                              ...prev, 
                              startDateTime: `${date}T09:00`,
                              endDateTime: `${date}T12:00`
                            }));
                          }}
                          className="text-xs"
                        >
                          Morning (9 AM - 12 PM)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const date = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                            setBlockFormData(prev => ({ 
                              ...prev, 
                              startDateTime: `${date}T14:00`,
                              endDateTime: `${date}T17:00`
                            }));
                          }}
                          className="text-xs"
                        >
                          Afternoon (2 PM - 5 PM)
                        </Button>
                      </div>
                    </div>
                  </div>
                 
                                                                     {blockFormData.startDateTime && blockFormData.endDateTime && (
                   <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                     <div className="text-sm text-blue-800">
                       <div className="font-medium">Time Off Period:</div>
                       <div>
                         {(() => {
                           try {
                             const startDate = new Date(blockFormData.startDateTime);
                             const endDate = new Date(blockFormData.endDateTime);
                             
                             // Check if dates are valid
                             if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                               return 'Invalid date range';
                             }
                             
                             return `${format(startDate, 'MMM dd, yyyy HH:mm')} - ${format(endDate, 'MMM dd, yyyy HH:mm')}`;
                           } catch (error) {
                             return 'Invalid date range';
                           }
                         })()}
                       </div>
                     </div>
                   </div>
                 )}
                 
                 <p className="text-xs text-blue-600">
                   ℹ️ You can book time-off for today or future dates. Same-day bookings are allowed.
                 </p>
               </TabsContent>
             </Tabs>
           </div>

                                 {/* Shift Selection - Only show for schedule tabs */}
            {scheduleType !== 'block' && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Shifts to Schedule</Label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {SHIFT_TEMPLATES.map((template) => (
                                 <Card 
                   key={template.name}
                   className={`cursor-pointer transition-all ${
                     selectedShifts.has(template.name) 
                       ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' 
                       : 'hover:shadow-md hover:bg-gray-50'
                   }`}
                   onClick={() => handleShiftToggle(template.name)}
                 >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {template.icon}
                        <CardTitle className="text-sm">{template.name} Shift</CardTitle>
                      </div>
                      <Switch
                        checked={selectedShifts.has(template.name)}
                        onCheckedChange={() => handleShiftToggle(template.name)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <Badge variant="secondary" className={`w-fit ${template.color}`}>
                      {template.description}
                    </Badge>
                  </CardHeader>
                  
                  {selectedShifts.has(template.name) && (
                    <CardContent className="pt-0 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                                                 <div>
                           <Label htmlFor={`${template.name}-start`}>Start Time</Label>
                           <Input
                             id={`${template.name}-start`}
                             type="time"
                             value={shiftConfigs[template.name].startTime}
                             onChange={(e) => {
                               e.stopPropagation();
                               handleShiftConfigChange(template.name, 'startTime', e.target.value);
                             }}
                             onMouseDown={(e) => e.stopPropagation()}
                             onClick={(e) => e.stopPropagation()}
                           />
                         </div>
                         <div>
                           <Label htmlFor={`${template.name}-end`}>End Time</Label>
                           <Input
                             id={`${template.name}-end`}
                             type="time"
                             value={shiftConfigs[template.name].endTime}
                             onChange={(e) => {
                               e.stopPropagation();
                               handleShiftConfigChange(template.name, 'endTime', e.target.value);
                             }}
                             onMouseDown={(e) => e.stopPropagation()}
                             onClick={(e) => e.stopPropagation()}
                           />
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                                                                          <div>
                                                                                   <Label htmlFor={`${template.name}-slot`}>Slot Duration (minutes)</Label>
                            <Input
                              id={`${template.name}-slot`}
                              type="number"
                              min="1"
                              step="1"
                              value={shiftConfigs[template.name].slotDuration}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleShiftConfigChange(template.name, 'slotDuration', parseInt(e.target.value) || 15);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="15"
                            />
                         </div>
                         <div>
                           <Label htmlFor={`${template.name}-max`}>Max Patients</Label>
                           <Input
                             id={`${template.name}-max`}
                             type="number"
                             min="1"
                             placeholder="Unlimited"
                             value={shiftConfigs[template.name].maxPatients}
                             onChange={(e) => {
                               e.stopPropagation();
                               handleShiftConfigChange(template.name, 'maxPatients', e.target.value);
                             }}
                             onMouseDown={(e) => e.stopPropagation()}
                             onClick={(e) => e.stopPropagation()}
                           />
                         </div>
                      </div>
                                         </CardContent>
                   )}
                                  </Card>
                ))}
              </div>

              {/* Schedule Summary */}
              {selectedShifts.size > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-2">Schedule Summary:</div>
                    <div className="space-y-1">
                      <div>• {selectedShifts.size} shift{selectedShifts.size > 1 ? 's' : ''} selected</div>
                      <div>• {scheduleMode === 'single' ? 'Single day' : 'Recurring'} schedule</div>
                      {scheduleMode === 'recurring' && (
                        <div>• {recurringDays.size} day{recurringDays.size > 1 ? 's' : ''} per week</div>
                      )}
                      <div>• Total schedules: {generatePayloads().length}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
                                                                           <Button
               type="submit"
               disabled={
                 (scheduleType === 'block' ? !isBlockFormValid() : !isScheduleFormValid()) || 
                 isLoading
               }
             >
                               {isLoading 
                  ? 'Saving...' 
                  : scheduleType === 'block' 
                    ? 'Schedule Time Off' 
                    : `Save ${scheduleMode === 'recurring' ? 'Recurring' : 'Personalized'} Schedule`
                }
             </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            Confirm Schedule Save
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            {pendingPayloads.length > 0 
              ? `Are you sure you want to save ${pendingPayloads.length} personalized schedule override(s)? This will update your working hours for the selected dates.`
              : `Are you sure you want to schedule this time off? You will be unavailable during the selected time period.`
            }
          </p>
          
          {pendingPayloads.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="font-medium text-blue-800 mb-1">Schedule Summary:</div>
              <div className="text-blue-700 space-y-1">
                <div>• {pendingPayloads.length} override{pendingPayloads.length > 1 ? 's' : ''} will be created</div>
                <div>• {scheduleMode === 'single' ? 'Single day' : 'Recurring'} schedule</div>
                {scheduleMode === 'recurring' && (
                  <div>• {recurringDays.size} day{recurringDays.size > 1 ? 's' : ''} per week</div>
                )}
              </div>
            </div>
          )}
          
          {pendingBlockPayload && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              <div className="font-medium text-orange-800 mb-1">Time Off Details:</div>
              <div className="text-orange-700 space-y-1">
                <div>• Type: {pendingBlockPayload.blockType}</div>
                <div>• Duration: {format(new Date(pendingBlockPayload.startDateTime), 'MMM dd, yyyy HH:mm')} - {format(new Date(pendingBlockPayload.endDateTime), 'MMM dd, yyyy HH:mm')}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelSave}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Yes, Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
