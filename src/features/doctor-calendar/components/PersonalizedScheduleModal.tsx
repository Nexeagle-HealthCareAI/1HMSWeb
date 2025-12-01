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
import { Clock, Calendar, Repeat, Sun, Moon, Sunrise, Sunset, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { CalendarService, CalendarViewType, DateRange } from '../services/calendarService';
import { DateRangeSelectionPopup } from './DateRangeSelectionPopup';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

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
  const { t } = useTranslation();
  
  const SHIFT_TEMPLATES: ShiftTemplate[] = [
    {
      name: 'Morning',
      icon: <Sunrise className="h-4 w-4" />,
      defaultStartTime: '09:00',
      defaultEndTime: '12:00',
      color: 'bg-teal-50 border-teal-200 text-teal-800',
      description: t('doctorCalendar.shifts.morningOPDHours')
    },
    {
      name: 'Afternoon',
      icon: <Sun className="h-4 w-4" />,
      defaultStartTime: '14:00',
      defaultEndTime: '17:00',
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      description: t('doctorCalendar.shifts.afternoonOPDHours')
    },
    {
      name: 'Evening',
      icon: <Sunset className="h-4 w-4" />,
      defaultStartTime: '18:00',
      defaultEndTime: '21:00',
      color: 'bg-violet-50 border-violet-200 text-violet-800',
      description: t('doctorCalendar.shifts.eveningOPDHours')
    }
  ];
  
  const [selectedShifts, setSelectedShifts] = useState<Set<ShiftName>>(new Set());
  const [shiftConfigs, setShiftConfigs] = useState<Record<ShiftName, {
    startTime: string;
    endTime: string;
    slotDuration: string; // keep as string so users can edit freely
    maxPatients: string;
    enabled: boolean;
  }>>({
    Morning: { startTime: '09:00', endTime: '12:00', slotDuration: '15', maxPatients: '', enabled: false },
    Afternoon: { startTime: '14:00', endTime: '17:00', slotDuration: '15', maxPatients: '', enabled: false },
    Evening: { startTime: '18:00', endTime: '21:00', slotDuration: '15', maxPatients: '', enabled: false }
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
    const newRecurringDays = new Set(recurringDays);
    if (newRecurringDays.has(dayIndex)) {
      newRecurringDays.delete(dayIndex);
    } else {
      newRecurringDays.add(dayIndex);
    }
    setRecurringDays(newRecurringDays);
  };

  const generatePayloads = (): CreateOverridePayload[] => {
    const payloads: CreateOverridePayload[] = [];
    
    if (scheduleMode === 'single') {
      // Single day schedule
      const payload: CreateOverridePayload = {
        doctorId,
        hospitalId: useAuthStore.getState().getHospitalId(),
        overrideDate: startDate,
        startDate,
        endDate,
        shiftDetails: Array.from(selectedShifts).map(shiftName => {
          const config = shiftConfigs[shiftName];
          const slotDuration = Math.max(1, Number(config.slotDuration) || 15);
          return {
            shiftName,
            startTime: config.startTime,
            endTime: config.endTime,
            slotDurationInMinutes: slotDuration,
            recurringDays: []
          };
        })
      };
      payloads.push(payload);
    } else {
      // Recurring schedule
      const start = parseISO(startDate);
      const end = parseISO(recurringEndDate);
      const days = Array.from(recurringDays);
      
      let currentDate = start;
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7
        
        if (days.includes(adjustedDayOfWeek)) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          const payload: CreateOverridePayload = {
            doctorId,
            hospitalId: useAuthStore.getState().getHospitalId(),
            overrideDate: dateStr,
            startDate: dateStr,
            endDate: dateStr,
            shiftDetails: Array.from(selectedShifts).map(shiftName => {
              const config = shiftConfigs[shiftName];
              const slotDuration = Math.max(1, Number(config.slotDuration) || 15);
              return {
                shiftName,
                startTime: config.startTime,
                endTime: config.endTime,
                slotDurationInMinutes: slotDuration,
                recurringDays: days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d - 1])
              };
            })
          };
          payloads.push(payload);
        }
        currentDate = addDays(currentDate, 1);
      }
    }
    
    return payloads;
  };

  const generateTimeOffPayload = (): CreateBlockPayload => {
    return {
      doctorId,
      title: `${blockFormData.blockType} - Time Off`,
      blockType: blockFormData.blockType,
      startDateTime: blockFormData.startDateTime,
      endDateTime: blockFormData.endDateTime
    };
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
      onSave(payloads);
      onOpenChange(false);
    }
   };

  const clampDateToToday = React.useCallback((dateStr: string) => {
    if (!dateStr) return format(new Date(), 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return dateStr < todayStr ? todayStr : dateStr;
  }, []);

  const ensureEndDateNotBeforeStart = React.useCallback((startDate: string, endDate: string) => {
    if (!endDate) return startDate;
    return endDate < startDate ? startDate : endDate;
  }, []);

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
      
  const generatedTitle = blockFormData.blockType;
      
      const payload: CreateBlockPayload = {
        doctorId,
        title: generatedTitle,
        blockType: blockFormData.blockType,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString()
      };
      
      if (onSaveBlock) {
        onSaveBlock(payload);
        onOpenChange(false);
      }
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
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Schedule & Time Off Management
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={scheduleType === 'block' ? handleBlockSubmit : handleSubmit} className="h-full flex flex-col">
            {/* Schedule Type Selection */}
            <div className="mb-4">
              <Tabs value={scheduleType} onValueChange={(value) => setScheduleType(value as 'schedule' | 'block')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="schedule" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger value="block" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Time Off
                  </TabsTrigger>
                </TabsList>
                
                <div className="mt-4">
                  <TabsContent value="schedule" className="space-y-4 h-full">
                    {/* Schedule Mode Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Schedule Type
                      </Label>
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
                            onChange={(e) => {
                              const safeDate = clampDateToToday(e.target.value);
                              setStartDate(safeDate);
                            }}
                            required
                          />
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800">{formatDate(startDate)}</span>
                        </div>
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
                              onChange={(e) => {
                                const safeStart = clampDateToToday(e.target.value);
                                setStartDate(safeStart);
                                setRecurringEndDate(prev => ensureEndDateNotBeforeStart(safeStart, prev));
                              }}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="recurringEndDate">End Date</Label>
                            <Input
                              id="recurringEndDate"
                              type="date"
                              value={recurringEndDate}
                              min={startDate || getMinDate()}
                              onChange={(e) => {
                                const safeStart = clampDateToToday(startDate || getMinDate());
                                const normalizedEnd = ensureEndDateNotBeforeStart(safeStart, e.target.value);
                                setStartDate(safeStart);
                                setRecurringEndDate(normalizedEnd);
                              }}
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Recurring Days</Label>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {DAYS.map(day => (
                              <Button
                                key={day.index}
                                type="button"
                                variant={recurringDays.has(day.index) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleDayToggle(day.index)}
                                className="h-7 px-2 text-xs"
                              >
                                {day.short}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shift Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Select Shifts</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {SHIFT_TEMPLATES.map((template) => {
                          const isSelected = selectedShifts.has(template.name);
                          const config = shiftConfigs[template.name];

                          return (
                            <Card
                              key={template.name}
                              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 bg-blue-50'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleShiftToggle(template.name)}
                            >
                              <CardContent className="p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1 rounded ${template.color}`}>
                                    {template.icon}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{template.name}</h4>
                                    <p className="text-xs text-gray-600">{template.description}</p>
                                  </div>
                                  <Switch
                                    checked={isSelected}
                                    onCheckedChange={() => handleShiftToggle(template.name)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>

                                {isSelected && (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs">Start Time</Label>
                                      <Input
                                        type="time"
                                        value={config.startTime}
                                        onChange={(e) => setShiftConfigs(prev => ({
                                          ...prev,
                                          [template.name]: { ...prev[template.name], startTime: e.target.value }
                                        }))}
                                        className="h-8 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">End Time</Label>
                                      <Input
                                        type="time"
                                        value={config.endTime}
                                        onChange={(e) => setShiftConfigs(prev => ({
                                          ...prev,
                                          [template.name]: { ...prev[template.name], endTime: e.target.value }
                                        }))}
                                        className="h-8 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Duration (min)</Label>
                                      <Input
                                        type="number"
                                        value={config.slotDuration}
                                        onChange={(e) => setShiftConfigs(prev => ({
                                          ...prev,
                                          [template.name]: { ...prev[template.name], slotDuration: e.target.value }
                                        }))}
                                        className="h-8 text-xs"
                                        min="1"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="block" className="space-y-4 h-full">
                    <div className="space-y-4">
                      {/* Block Type Selection */}
                      <div>
                        <Label htmlFor="blockType" className="text-sm font-semibold">Type of Time Off</Label>
                        <Select
                          value={blockFormData.blockType}
                          onValueChange={(value: BlockType) => setBlockFormData(prev => ({ ...prev, blockType: value }))}
                        >
                          <SelectTrigger className="mt-1">
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
                      
                      {/* Date & Time Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Start Date & Time */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Start Date & Time</Label>
                          <div className="space-y-2">
                            <Input
                              type="date"
                              value={blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : ''}
                              min={format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => {
                                const rawDate = e.target.value;
                                const safeStartDate = clampDateToToday(rawDate);
                                const currentStartTime = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[1] : '09:00';
                                const currentEndTime = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[1] : '17:00';
                                const existingEndDate = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[0] : safeStartDate;
                                const normalizedEndDate = ensureEndDateNotBeforeStart(safeStartDate, existingEndDate);
                                const normalizedEndTime = normalizedEndDate === safeStartDate && currentEndTime < currentStartTime
                                  ? currentStartTime
                                  : currentEndTime;

                                setBlockFormData(prev => ({
                                  ...prev,
                                  startDateTime: `${safeStartDate}T${currentStartTime}`,
                                  endDateTime: `${normalizedEndDate}T${normalizedEndTime}`
                                }));
                              }}
                              required
                            />
                            <Input
                              type="time"
                              value={blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[1] : '09:00'}
                              onChange={(e) => {
                                const date = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                                setBlockFormData(prev => ({ 
                                  ...prev, 
                                  startDateTime: `${date}T${e.target.value}` 
                                }));
                              }}
                              required
                            />
                          </div>
                        </div>

                        {/* End Date & Time */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">End Date & Time</Label>
                          <div className="space-y-2">
                            <Input
                              type="date"
                              value={blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[0] : ''}
                              min={blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => {
                                const rawDate = e.target.value;
                                const startDate = blockFormData.startDateTime
                                  ? blockFormData.startDateTime.split('T')[0]
                                  : format(new Date(), 'yyyy-MM-dd');
                                const safeStartDate = clampDateToToday(startDate);
                                const normalizedEndDate = ensureEndDateNotBeforeStart(safeStartDate, rawDate);
                                const currentEndTime = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[1] : '17:00';
                                const startTime = blockFormData.startDateTime ? blockFormData.startDateTime.split('T')[1] : '09:00';
                                const adjustedEndTime = normalizedEndDate === safeStartDate && currentEndTime < startTime
                                  ? startTime
                                  : currentEndTime;

                                setBlockFormData(prev => ({
                                  ...prev,
                                  startDateTime: prev.startDateTime || `${safeStartDate}T${startTime}`,
                                  endDateTime: `${normalizedEndDate}T${adjustedEndTime}`
                                }));
                              }}
                              required
                            />
                            <Input
                              type="time"
                              value={blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[1] : '17:00'}
                              onChange={(e) => {
                                const date = blockFormData.endDateTime ? blockFormData.endDateTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                                setBlockFormData(prev => ({ 
                                  ...prev, 
                                  endDateTime: `${date}T${e.target.value}` 
                                }));
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <Card className="p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Time Off Summary</span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><strong>Type:</strong> {blockFormData.blockType}</p>
                          <p><strong>Start:</strong> {blockFormData.startDateTime ? format(new Date(blockFormData.startDateTime), 'MMM dd, yyyy HH:mm') : 'Not set'}</p>
                          <p><strong>End:</strong> {blockFormData.endDateTime ? format(new Date(blockFormData.endDateTime), 'MMM dd, yyyy HH:mm') : 'Not set'}</p>
                        </div>
                      </Card>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Footer */}
            <DialogFooter className="pt-4 border-t bg-white dark:bg-gray-900 sticky bottom-0 z-10 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto h-11 text-sm font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || (scheduleType === 'schedule' ? !isScheduleFormValid() : !isBlockFormValid())}
                className="w-full sm:w-auto h-11 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30"
              >
                {isLoading ? 'Saving...' : scheduleType === 'schedule' ? 'Save Schedule' : 'Save Time Off'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      


    </>
  );
};