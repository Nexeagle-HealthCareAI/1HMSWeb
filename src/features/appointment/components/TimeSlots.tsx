import React, { useState } from 'react';
import { Clock, Edit, Calendar, X } from 'lucide-react';
import { TimeSlot } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { RescheduleDialog } from './RescheduleDialog';
import { EditPatientDialog } from './EditPatientDialog';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import { cn } from '@/lib/utils';

interface TimeSlotsProps {
  timeSlots: TimeSlot[];
  selectedShift: string;
  onSlotSelect: (slot: TimeSlot) => void;
  onSlotUpdate: (slot: TimeSlot) => void;
  onSlotCancel: (slotId: string) => void;
}

const shiftTimes = {
  morning: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
  afternoon: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
  evening: ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'],
  night: ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30']
};

export const TimeSlots: React.FC<TimeSlotsProps> = ({
  timeSlots,
  selectedShift,
  onSlotSelect,
  onSlotUpdate,
  onSlotCancel
}) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [selectedSlotForAction, setSelectedSlotForAction] = useState<TimeSlot | null>(null);

  const currentShiftTimes = shiftTimes[selectedShift as keyof typeof shiftTimes] || [];
  const currentShiftSlots = timeSlots.filter(slot => 
    currentShiftTimes.includes(slot.time)
  );

  const handleReschedule = (slot: TimeSlot) => {
    setSelectedSlotForAction(slot);
    setShowReschedule(true);
  };

  const handleEdit = (slot: TimeSlot) => {
    setSelectedSlotForAction(slot);
    setShowEdit(true);
  };

  const handleCancel = (slot: TimeSlot) => {
    setSelectedSlotForAction(slot);
    setShowCancel(true);
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  return (
    <TooltipProvider>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Available Time Slots
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {currentShiftSlots.map((slot) => (
            <Tooltip key={slot.id}>
              <TooltipTrigger asChild>
                <Card
                  className={cn(
                    "p-4 cursor-pointer transition-all duration-200 border-2",
                    slot.isBooked 
                      ? "bg-slot-booked border-slot-booked-border hover:bg-slot-booked-hover hover:shadow-md" 
                      : "bg-slot-available border-slot-available-border hover:bg-slot-available-hover hover:shadow-md"
                  )}
                  onClick={() => !slot.isBooked && onSlotSelect(slot)}
                >
                  <div className="text-center space-y-2">
                    <Clock className={cn(
                      "h-5 w-5 mx-auto",
                      slot.isBooked ? "text-red-500" : "text-green-500"
                    )} />
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {formatTime(slot.time)}
                      </h4>
                      <Badge 
                        variant={slot.isBooked ? "destructive" : "default"}
                        className="text-xs mt-1"
                      >
                        {slot.isBooked ? 'Booked' : 'Available'}
                      </Badge>
                    </div>
                    
                    {slot.isBooked && slot.patientInfo && (
                      <div className="mt-3 pt-2 border-t border-border">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReschedule(slot);
                            }}
                          >
                            <Calendar className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(slot);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(slot);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </TooltipTrigger>
              
              {slot.isBooked && slot.patientInfo && (
                <TooltipContent side="top" className="bg-white border shadow-lg p-3">
                  <div className="space-y-1 text-sm">
                    <p><strong>Patient:</strong> {slot.patientInfo.name}</p>
                    <p><strong>Phone:</strong> {slot.patientInfo.phone}</p>
                    <p><strong>Age:</strong> {slot.patientInfo.age}</p>
                    <p><strong>Gender:</strong> {slot.patientInfo.gender}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        {currentShiftSlots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No time slots available for this shift</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showReschedule && selectedSlotForAction && (
        <RescheduleDialog
          slot={selectedSlotForAction}
          onConfirm={(newSlot) => {
            onSlotUpdate(newSlot);
            setShowReschedule(false);
            setSelectedSlotForAction(null);
          }}
          onCancel={() => {
            setShowReschedule(false);
            setSelectedSlotForAction(null);
          }}
        />
      )}

      {showEdit && selectedSlotForAction && (
        <EditPatientDialog
          slot={selectedSlotForAction}
          onConfirm={(updatedSlot) => {
            onSlotUpdate(updatedSlot);
            setShowEdit(false);
            setSelectedSlotForAction(null);
          }}
          onCancel={() => {
            setShowEdit(false);
            setSelectedSlotForAction(null);
          }}
        />
      )}

      {showCancel && selectedSlotForAction && (
        <CancelAppointmentDialog
          slot={selectedSlotForAction}
          onConfirm={() => {
            onSlotCancel(selectedSlotForAction.id);
            setShowCancel(false);
            setSelectedSlotForAction(null);
          }}
          onCancel={() => {
            setShowCancel(false);
            setSelectedSlotForAction(null);
          }}
        />
      )}
    </TooltipProvider>
  );
};