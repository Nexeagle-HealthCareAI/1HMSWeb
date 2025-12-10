import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock } from 'lucide-react';
import { TimeSlot } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface RescheduleDialogProps {
  slot: TimeSlot;
  onConfirm: (newSlot: TimeSlot) => void;
  onCancel: () => void;
}

// TODO: Replace with actual API call
const generateAvailableSlots = (date: Date) => {
  // This should call the actual API to get available slots
  return [];
};

export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  slot,
  onConfirm,
  onCancel
}) => {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [step, setStep] = useState<'date' | 'time'>('date');

  const availableSlots = generateAvailableSlots(selectedDate);

  const appointmentDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: 'long',
        day: '2-digit',
        year: 'numeric'
      }),
    [i18n.language]
  );

  const selectedDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'long',
        month: 'long',
        day: '2-digit',
        year: 'numeric'
      }),
    [i18n.language]
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        hour: 'numeric',
        minute: '2-digit'
      }),
    [i18n.language]
  );

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hour, 10) || 0, parseInt(minute || '0', 10) || 0, 0, 0);
    return timeFormatter.format(date);
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
            {t('rescheduleDialog.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Current Appointment */}
        <Card className="p-4 bg-muted">
          <h3 className="font-semibold text-foreground mb-2">{t('rescheduleDialog.current.title')}</h3>
          <div className="space-y-1 text-sm">
            <p><strong>{t('rescheduleDialog.current.patient')}</strong> {slot.patientInfo?.name}</p>
            <p><strong>{t('rescheduleDialog.current.date')}</strong> {appointmentDateFormatter.format(new Date(slot.date))}</p>
            <p><strong>{t('rescheduleDialog.current.time')}</strong> {formatTime(slot.time)}</p>
          </div>
        </Card>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
            step === 'date' ? "bg-healthcare-primary text-white" : "bg-muted"
          )}>
            <Calendar className="h-4 w-4" />
            <span>{t('rescheduleDialog.steps.date')}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
            step === 'time' ? "bg-healthcare-primary text-white" : "bg-muted"
          )}>
            <Clock className="h-4 w-4" />
            <span>{t('rescheduleDialog.steps.time')}</span>
          </div>
        </div>

        {/* Date Selection */}
        {step === 'date' && (
          <div>
            <h3 className="font-semibold text-foreground mb-3">{t('rescheduleDialog.selectNewDate')}</h3>
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
              <h3 className="font-semibold text-foreground">{t('rescheduleDialog.selectNewTime')}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('date')}
              >
                {t('rescheduleDialog.changeDate')}
              </Button>
            </div>
            
            <Card className="p-3 bg-muted mb-4">
              <p className="text-sm">
                <strong>{t('rescheduleDialog.selectedDateLabel')}</strong> {selectedDateFormatter.format(selectedDate)}
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
                    {timeSlot.isAvailable ? t('rescheduleDialog.slot.available') : t('rescheduleDialog.slot.booked')}
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
            {t('rescheduleDialog.actions.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
            className="flex-1 bg-healthcare-primary hover:bg-healthcare-primary/90"
          >
            {t('rescheduleDialog.actions.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};