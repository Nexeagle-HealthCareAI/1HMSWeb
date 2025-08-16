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

interface PersonalizedScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  initialDate?: string;
  initialStartDateTime?: string;
  initialEndDateTime?: string;
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
  onSave,
  onSaveBlock,
  isLoading = false
}) => {
  const [selectedShifts, setSelectedShifts] = useState<Set<ShiftName>>(new Set());
     const [shiftConfigs, setShiftConfigs] = useState<Record<ShiftName, {
     startTime: string;
     endTime: string;
     slotMinutes: number;
     maxPatients: string;
     enabled: boolean;
   }>>({
     Morning: { startTime: '09:00', endTime: '12:00', slotMinutes: 10, maxPatients: '', enabled: false },
     Afternoon: { startTime: '14:00', endTime: '17:00', slotMinutes: 10, maxPatients: '', enabled: false },
     Evening: { startTime: '18:00', endTime: '21:00', slotMinutes: 10, maxPatients: '', enabled: false },
     Night: { startTime: '22:00', endTime: '06:00', slotMinutes: 10, maxPatients: '', enabled: false }
   });

               const [scheduleType, setScheduleType] = useState<'schedule' | 'block'>(
     initialStartDateTime && initialEndDateTime ? 'block' : 'schedule'
   );
  const [startDate, setStartDate] = useState(initialDate || format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(initialDate || format(addDays(new Date(), 1), 'yyyy-MM-dd'));
     const [scheduleMode, setScheduleMode] = useState<'single' | 'recurring'>('single');
   const [recurringDays, setRecurringDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5])); // Mon-Fri
   const [recurringEndDate, setRecurringEndDate] = useState(format(addWeeks(new Date(), 4), 'yyyy-MM-dd'));

     // Block form state
   const [blockFormData, setBlockFormData] = useState({
     title: '',
     blockType: 'Personal' as BlockType,
     startDateTime: '',
     endDateTime: ''
   });

  // Initialize block form data
  useEffect(() => {
    if (initialStartDateTime && initialEndDateTime) {
      setBlockFormData(prev => ({
        ...prev,
        startDateTime: format(new Date(initialStartDateTime), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(new Date(initialEndDateTime), "yyyy-MM-dd'T'HH:mm")
      }));
    } else {
      // Default to tomorrow with reasonable times
      const tomorrow = addDays(new Date(), 1);
      const startTime = new Date(tomorrow);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(17, 0, 0, 0);
      
      setBlockFormData(prev => ({
        ...prev,
        startDateTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(endTime, "yyyy-MM-dd'T'HH:mm")
      }));
    }
  }, [initialStartDateTime, initialEndDateTime]);

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

                       const generatePayloads = (): CreateOverridePayload[] => {
       const payloads: CreateOverridePayload[] = [];
       
       if (scheduleMode === 'single') {
         // Single day schedule
         selectedShifts.forEach(shiftName => {
           const config = shiftConfigs[shiftName];
           if (config.enabled) {
             payloads.push({
               doctorId,
               shiftDate: startDate,
               shiftName,
               startTime: config.startTime,
               endTime: config.endTime,
               slotMinutes: config.slotMinutes,
               maxPatients: config.maxPatients ? parseInt(config.maxPatients) : null,
               reason: `Personalized ${shiftName} Schedule`
             });
           }
         });
       } else {
         // Recurring schedule
         const start = parseISO(startDate);
         const end = parseISO(recurringEndDate);
         let current = start;

         while (current <= end) {
           const dayOfWeek = current.getDay();
           const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday=0 to Sunday=7

           if (recurringDays.has(adjustedDay)) {
             selectedShifts.forEach(shiftName => {
               const config = shiftConfigs[shiftName];
               if (config.enabled) {
                 payloads.push({
                   doctorId,
                   shiftDate: format(current, 'yyyy-MM-dd'),
                   shiftName,
                   startTime: config.startTime,
                   endTime: config.endTime,
                   slotMinutes: config.slotMinutes,
                   maxPatients: config.maxPatients ? parseInt(config.maxPatients) : null,
                   reason: `Recurring ${shiftName} Schedule`
                 });
               }
             });
           }
           current = addDays(current, 1);
         }
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
       onSave(payloads);
     }
   };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!onSaveBlock) return;
    
    const payload: CreateBlockPayload = {
      doctorId,
      title: blockFormData.title,
      blockType: blockFormData.blockType,
      startDateTime: new Date(blockFormData.startDateTime).toISOString(),
      endDateTime: new Date(blockFormData.endDateTime).toISOString()
    };
    
    onSaveBlock(payload);
  };

     const isBlockFormValid = () => {
     if (!blockFormData.title.trim()) return false;
     
     const start = new Date(blockFormData.startDateTime);
     const end = new Date(blockFormData.endDateTime);
     
     return start < end && !isNaN(start.getTime()) && !isNaN(end.getTime());
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

   // Get minimum allowed date (tomorrow)
   const getMinDate = () => {
     return format(addDays(new Date(), 1), 'yyyy-MM-dd');
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
                    <Label htmlFor="blockTitle">Title</Label>
                                         <Input
                       id="blockTitle"
                       value={blockFormData.title}
                       onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                       placeholder="e.g., Family vacation, Medical conference, Emergency call"
                       required
                     />
                  </div>
                  
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
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="blockStartDateTime">Start Date & Time</Label>
                     <Input
                       id="blockStartDateTime"
                       type="datetime-local"
                       value={blockFormData.startDateTime}
                       min={getMinDate() + 'T00:00'}
                       onChange={(e) => setBlockFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                       required
                     />
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="blockEndDateTime">End Date & Time</Label>
                     <Input
                       id="blockEndDateTime"
                       type="datetime-local"
                       value={blockFormData.endDateTime}
                       min={blockFormData.startDateTime}
                       onChange={(e) => setBlockFormData(prev => ({ ...prev, endDateTime: e.target.value }))}
                       required
                     />
                   </div>
                 </div>
                 
                                   {blockFormData.startDateTime && blockFormData.endDateTime && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <div className="font-medium">Time Off Period:</div>
                        <div>
                          {format(new Date(blockFormData.startDateTime), 'MMM dd, yyyy HH:mm')} - {format(new Date(blockFormData.endDateTime), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  )}
                 
                 <p className="text-xs text-amber-600">
                   ⚠️ Only future dates are allowed (tomorrow and onwards)
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
                             min="5"
                             max="120"
                             step="5"
                             value={shiftConfigs[template.name].slotMinutes}
                             onChange={(e) => {
                               e.stopPropagation();
                               handleShiftConfigChange(template.name, 'slotMinutes', parseInt(e.target.value) || 10);
                             }}
                             onMouseDown={(e) => e.stopPropagation()}
                             onClick={(e) => e.stopPropagation()}
                             placeholder="10"
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
  );
};
