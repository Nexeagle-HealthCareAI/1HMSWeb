import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShiftName, CreateOverridePayload, BlockType, CreateBlockPayload } from '../api/types';
import { format, parseISO, addDays, addWeeks, addMonths } from 'date-fns';
import { Clock, Calendar, Repeat, Sun, Moon, Sunrise, Sunset, Info, AlertCircle, CheckCircle, Activity, CalendarDays } from 'lucide-react';
import { CalendarService, CalendarViewType, DateRange } from '../services/calendarService';
import { DateRangeSelectionPopup } from './DateRangeSelectionPopup';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/gamified-calendar.css';

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
  label: string;
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
  const { toast } = useToast();

  const SHIFT_TEMPLATES: ShiftTemplate[] = [
    {
      name: 'Morning',
      icon: <Sunrise className="h-4 w-4" />,
      defaultStartTime: '09:00',
      defaultEndTime: '12:00',
      color: 'bg-teal-50 border-teal-200 text-teal-800',
      label: t('doctorCalendar.shifts.morning'),
      description: t('doctorCalendar.shifts.morningOPDHours')
    },
    {
      name: 'Afternoon',
      icon: <Sun className="h-4 w-4" />,
      defaultStartTime: '14:00',
      defaultEndTime: '17:00',
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      label: t('doctorCalendar.shifts.afternoon'),
      description: t('doctorCalendar.shifts.afternoonOPDHours')
    },
    {
      name: 'Evening',
      icon: <Sunset className="h-4 w-4" />,
      defaultStartTime: '18:00',
      defaultEndTime: '21:00',
      color: 'bg-violet-50 border-violet-200 text-violet-800',
      label: t('doctorCalendar.shifts.evening'),
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

  useEffect(() => {
    if (!open) return;
    const desiredType: 'schedule' | 'block' = initialStartDateTime && initialEndDateTime ? 'block' : 'schedule';
    setScheduleType(prev => (prev === desiredType ? prev : desiredType));
  }, [open, initialStartDateTime, initialEndDateTime]);
  const [startDate, setStartDate] = useState(initialDate || '');
  const [endDate, setEndDate] = useState(initialDate || '');

  // Date range selection state
  const [showDateRangePopup, setShowDateRangePopup] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  const [scheduleMode] = useState<'single' | 'recurring'>('recurring');
  const [recurringDays, setRecurringDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5])); // Mon-Fri
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [isCelebrated, setIsCelebrated] = useState(false);

  // Block form state
  const [blockFormData, setBlockFormData] = useState({
    blockType: 'Personal' as BlockType,
    startDateTime: '',
    endDateTime: ''
  });

  // Calculate Gamification Progress
  const calculateProgress = () => {
    let tasks = 0;
    let completed = 0;

    if (scheduleType === 'schedule') {
      tasks = 3; // Shift selection, date range, recurring days
      if (selectedShifts.size > 0) completed++;
      if (startDate && recurringEndDate) completed++;
      if (recurringDays.size > 0) completed++;
    } else {
      tasks = 2; // Block type, date range
      if (blockFormData.blockType) completed++;
      if (blockFormData.startDateTime && blockFormData.endDateTime) completed++;
    }

    return tasks > 0 ? (completed / tasks) * 100 : 0;
  };

  const progress = calculateProgress();



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
    const currentHospitalId = useAuthStore.getState().getHospitalId(); // Get ID directly

    // Map 1-based index (1=Mon...7=Sun) to string abbreviations
    const daysMap: Record<number, string> = {
      1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'
    };

    // Recurring schedule - Send Single Payload
    const selectedDayStrings = Array.from(recurringDays).map(d => daysMap[d]).filter(Boolean);

    const payload: CreateOverridePayload = {
      doctorId,
      hospitalId: currentHospitalId,
      overrideDate: startDate, // Use start date as reference
      startDate: startDate,
      endDate: recurringEndDate,
      shiftDetails: Array.from(selectedShifts).map(shiftName => {
        const config = shiftConfigs[shiftName];
        const slotDuration = Math.max(1, Number(config.slotDuration) || 15);
        return {
          shiftName,
          startTime: config.startTime,
          endTime: config.endTime,
          slotDurationInMinutes: slotDuration,
          recurringDays: selectedDayStrings
        };
      })
    };
    payloads.push(payload);

    return payloads;
  };

  const generateTimeOffPayload = (): CreateBlockPayload => {
    return {
      doctorId,
      title: `${getBlockTypeLabel(blockFormData.blockType)} - ${t('doctorCalendar.personalizedScheduleModal.block.timeOff')}`,
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
      toast({
        title: t('doctorCalendar.personalizedScheduleModal.validation.selectShift.title'),
        description: t('doctorCalendar.personalizedScheduleModal.validation.selectShift.description'),
        variant: 'destructive'
      });
      return; // No shifts selected
    }

    // Validate recurring schedule settings
    if (recurringDays.size === 0) {
      toast({
        title: t('doctorCalendar.personalizedScheduleModal.validation.recurringDays.title'),
        description: t('doctorCalendar.personalizedScheduleModal.validation.recurringDays.description'),
        variant: 'destructive'
      });
      return; // No days selected for recurring schedule
    }

    const start = parseISO(startDate);
    const end = parseISO(recurringEndDate);
    if (!(start instanceof Date) || isNaN(start.getTime()) || !(end instanceof Date) || isNaN(end.getTime()) || start >= end) {
      toast({
        title: t('doctorCalendar.personalizedScheduleModal.validation.dateRange.title'),
        description: t('doctorCalendar.personalizedScheduleModal.validation.dateRange.description'),
        variant: 'destructive'
      });
      return; // End date must be after start date
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
      toast({
        title: t('doctorCalendar.personalizedScheduleModal.validation.shiftTimes.title'),
        description: t('doctorCalendar.personalizedScheduleModal.validation.shiftTimes.description'),
        variant: 'destructive'
      });
      return; // Invalid shift configurations
    }

    const payloads = generatePayloads();
    if (payloads.length > 0) {
      setIsCelebrated(true);
      onSave(payloads);
      setTimeout(() => {
        setIsCelebrated(false);
        onOpenChange(false);
      }, 2000);
    } else {
      toast({
        title: t('doctorCalendar.personalizedScheduleModal.validation.noPayload.title'),
        description: t('doctorCalendar.personalizedScheduleModal.validation.noPayload.description'),
        variant: 'destructive'
      });
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
        setIsCelebrated(true);
        onSaveBlock(payload);
        setTimeout(() => {
          setIsCelebrated(false);
          onOpenChange(false);
        }, 2000);
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
    if (recurringDays.size === 0) return false;

    const start = parseISO(startDate);
    const end = parseISO(recurringEndDate);
    if (start >= end) return false;

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

  const getBlockTypeLabel = (blockType: BlockType) => {
    const keyMap: Record<BlockType, string> = {
      'Annual Leave': 'annualLeave',
      'Sick Leave': 'sickLeave',
      Personal: 'personal',
      Conference: 'conference',
      Training: 'training',
      Meeting: 'meeting',
      Emergency: 'emergency',
      Other: 'other'
    };

    const translationKey = keyMap[blockType] ?? 'other';
    return t(`doctorCalendar.personalizedScheduleModal.blockTypes.${translationKey}`, {
      defaultValue: blockType
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
    { index: 1, key: 'monday', shortKey: 'mon' },
    { index: 2, key: 'tuesday', shortKey: 'tue' },
    { index: 3, key: 'wednesday', shortKey: 'wed' },
    { index: 4, key: 'thursday', shortKey: 'thu' },
    { index: 5, key: 'friday', shortKey: 'fri' },
    { index: 6, key: 'saturday', shortKey: 'sat' },
    { index: 7, key: 'sunday', shortKey: 'sun' }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl gamified-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <DialogHeader className={`p-6 text-white transition-colors duration-500 rounded-t-2xl ${scheduleType === 'schedule' ? 'bg-gradient-schedule glow-schedule' : 'bg-gradient-timeoff glow-timeoff'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                    {scheduleType === 'schedule' ? <Sun className="animate-pulse" /> : <Moon className="animate-float" />}
                    {scheduleType === 'schedule' ? t('doctorCalendar.personalizedScheduleModal.title') : t('doctorCalendar.personalizedScheduleModal.blockTitle')}
                  </DialogTitle>
                  <p className="text-white/80 text-sm mt-1">
                    {scheduleType === 'schedule' ? 'Mission: Optimize Your Calendar' : 'Zen Time: Restore Your Energy'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Mission Score</div>
                  <div className="text-2xl font-black">{Math.round(progress)}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 mission-progress-bar bg-white/20">
                <motion.div
                  className="mission-progress-fill bg-white shadow-[0_0_10px_white]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </DialogHeader>

            <form onSubmit={scheduleType === 'block' ? handleBlockSubmit : handleSubmit} className="flex flex-col max-h-[calc(85vh-120px)]">
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {/* Schedule Type Selection */}
                <div className="mb-6">
                  <div className="grid w-full grid-cols-2 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${scheduleType === 'schedule'
                        ? 'bg-white text-blue-600 shadow-md scale-[1.02]'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                      onClick={() => setScheduleType('schedule')}
                    >
                      <Clock className="h-4 w-4" />
                      {t('doctorCalendar.personalizedScheduleModal.tabs.schedule')}
                    </button>
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${scheduleType === 'block'
                        ? 'bg-white text-emerald-600 shadow-md scale-[1.02]'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                      onClick={() => setScheduleType('block')}
                    >
                      <AlertCircle className="h-4 w-4" />
                      {t('doctorCalendar.personalizedScheduleModal.tabs.timeOff')}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {scheduleType === 'schedule' ? (
                    <div className="space-y-6">
                      {/* Shift Configuration */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Morning', 'Afternoon', 'Evening'].map((shift) => (
                          <motion.div
                            key={shift}
                            layout
                            initial={false}
                            className={`p-1 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${selectedShifts.has(shift as ShiftName) ? 'border-blue-500 bg-blue-50/50 shadow-blue-100/50 shadow-xl' : 'border-gray-100 bg-white hover:border-blue-200'}`}
                            onClick={() => handleShiftToggle(shift as ShiftName)}
                          >
                            <div className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${selectedShifts.has(shift as ShiftName) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  {shift === 'Morning' ? <Sunrise size={20} /> : shift === 'Afternoon' ? <Sun size={20} /> : <Sunset size={20} />}
                                </div>
                                <div>
                                  <div className="font-bold text-lg">{shift}</div>
                                  <div className="text-xs text-gray-500 font-medium">
                                    {shiftConfigs[shift as ShiftName].startTime} — {shiftConfigs[shift as ShiftName].endTime}
                                  </div>
                                </div>
                              </div>
                              {selectedShifts.has(shift as ShiftName) && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                  <CheckCircle className="text-blue-500" size={24} />
                                </motion.div>
                              )}
                            </div>

                            <AnimatePresence>
                              {selectedShifts.has(shift as ShiftName) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                  className="bg-white/60 backdrop-blur-sm border-t border-blue-100 p-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">Start Time</Label>
                                      <Input
                                        type="time"
                                        value={shiftConfigs[shift as ShiftName].startTime}
                                        onChange={(e) => handleShiftConfigChange(shift as ShiftName, 'startTime', e.target.value)}
                                        className="h-9 rounded-lg border-blue-100 focus:ring-blue-500 transition-all font-mono"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">End Time</Label>
                                      <Input
                                        type="time"
                                        value={shiftConfigs[shift as ShiftName].endTime}
                                        onChange={(e) => handleShiftConfigChange(shift as ShiftName, 'endTime', e.target.value)}
                                        className="h-9 rounded-lg border-blue-100 focus:ring-blue-500 transition-all font-mono"
                                      />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                      <Label className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">Slot Duration (Min)</Label>
                                      <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
                                        <Input
                                          type="number"
                                          min="1"
                                          value={shiftConfigs[shift as ShiftName].slotDuration}
                                          onChange={(e) => handleShiftConfigChange(shift as ShiftName, 'slotDuration', e.target.value)}
                                          className="h-9 pl-9 rounded-lg border-blue-100 focus:ring-blue-500 transition-all font-bold"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>

                      {/* Recurring Dates */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-gray-400">Start Date</Label>
                          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border-gray-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-gray-400">End Date</Label>
                          <Input type="date" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} className="rounded-xl border-gray-200" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Time Off Logic */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-400">Reason</Label>
                        <Select value={blockFormData.blockType} onValueChange={(v: any) => setBlockFormData({ ...blockFormData, blockType: v })}>
                          <SelectTrigger className="rounded-xl border-gray-200">
                            <SelectValue placeholder="Select Reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Personal">Personal</SelectItem>
                            <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                            <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-gray-400">Start</Label>
                          <Input type="datetime-local" value={blockFormData.startDateTime} onChange={(e) => setBlockFormData({ ...blockFormData, startDateTime: e.target.value })} className="rounded-xl border-gray-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-gray-400">End</Label>
                          <Input type="datetime-local" value={blockFormData.endDateTime} onChange={(e) => setBlockFormData({ ...blockFormData, endDateTime: e.target.value })} className="rounded-xl border-gray-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <DialogFooter className="p-6 border-t bg-gray-50/50 backdrop-blur-sm rounded-b-2xl">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-gray-400 hover:text-gray-600">Cancel Mission</Button>
                <Button
                  type="submit"
                  disabled={isLoading || (scheduleType === 'schedule' ? !isScheduleFormValid() : !isBlockFormValid())}
                  className={`rounded-xl px-10 font-black tracking-wide transition-all shadow-lg active:scale-95 ${scheduleType === 'schedule' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-200' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-200'} text-white border-0`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <Activity size={18} />
                      </motion.div>
                      Deploying...
                    </div>
                  ) : 'Deploy Mission'}
                </Button>
              </DialogFooter>
            </form>
          </motion.div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {isCelebrated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <motion.div
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border-4 border-emerald-500"
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <div className="bg-emerald-100 p-4 rounded-full">
                <CheckCircle className="text-emerald-600 h-16 w-16" />
              </div>
              <h2 className="text-3xl font-black text-emerald-600 tracking-tighter uppercase italic">Mission Accomplished</h2>
              <p className="text-gray-500 font-bold">Your schedule has been optimized!</p>

              <div className="flex gap-2">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-emerald-400"
                    animate={{
                      y: [0, -100],
                      x: [0, (i - 6) * 40],
                      opacity: [1, 0],
                      scale: [1, 2]
                    }}
                    transition={{ duration: 1, delay: i * 0.05, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};