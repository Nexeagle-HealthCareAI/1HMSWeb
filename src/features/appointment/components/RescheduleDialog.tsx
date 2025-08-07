import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { TimeSlot } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface RescheduleDialogProps {
  slot: TimeSlot;
  onConfirm: (newSlot: TimeSlot) => void;
  onCancel: () => void;
}

// Mock available slots for demo
const generateAvailableSlots = (date: Date) => {
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  return times.map(time => ({
    time,
    isAvailable: Math.random() > 0.3
  }));
};

export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  slot,
  onConfirm,
  onCancel
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [step, setStep] = useState<'date' | 'time'>('date');

  const availableSlots = generateAvailableSlots(selectedDate);

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute || '00'} ${ampm}`;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime('');
      setStep('time');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      const newSlot: TimeSlot = {
        ...slot,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        id: `${slot.doctorId}-${selectedDate.toISOString().split('T')[0]}-${selectedTime}`
      };
      onConfirm(newSlot);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-healthcare-primary">
            Reschedule Appointment
          </DialogTitle>
        </DialogHeader>

        {/* Current Appointment */}
        <Card className="p-4 bg-muted">
          <h3 className="font-semibold text-foreground mb-2">Current Appointment</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Patient:</strong> {slot.patientInfo?.name}</p>
            <p><strong>Date:</strong> {format(new Date(slot.date), 'MMMM dd, yyyy')}</p>
            <p><strong>Time:</strong> {formatTime(slot.time)}</p>
          </div>
        </Card>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
            step === 'date' ? "bg-healthcare-primary text-white" : "bg-muted"
          )}>
            <Calendar className="h-4 w-4" />
            <span>1. Select Date</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
            step === 'time' ? "bg-healthcare-primary text-white" : "bg-muted"
          )}>
            <Clock className="h-4 w-4" />
            <span>2. Select Time</span>
          </div>
        </div>

        {/* Date Selection */}
        {step === 'date' && (
          <div>
            <h3 className="font-semibold text-foreground mb-3">Select New Date</h3>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              initialFocus
              className="p-3 pointer-events-auto border rounded-lg"
            />
          </div>
        )}

        {/* Time Selection */}
        {step === 'time' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Select New Time</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('date')}
              >
                Change Date
              </Button>
            </div>
            
            <Card className="p-3 bg-muted mb-4">
              <p className="text-sm">
                <strong>Selected Date:</strong> {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              {availableSlots.map((timeSlot) => (
                <Button
                  key={timeSlot.time}
                  variant={selectedTime === timeSlot.time ? "default" : "outline"}
                  disabled={!timeSlot.isAvailable}
                  className={cn(
                    "h-12 flex-col",
                    selectedTime === timeSlot.time && "bg-healthcare-primary hover:bg-healthcare-primary/90"
                  )}
                  onClick={() => timeSlot.isAvailable && handleTimeSelect(timeSlot.time)}
                >
                  <span className="font-medium">{formatTime(timeSlot.time)}</span>
                  <Badge 
                    variant={timeSlot.isAvailable ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {timeSlot.isAvailable ? 'Available' : 'Booked'}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
            className="flex-1 bg-healthcare-primary hover:bg-healthcare-primary/90"
          >
            Confirm Reschedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};