import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calendar, Clock, User } from 'lucide-react';
import { TimeSlot } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface CancelAppointmentDialogProps {
  slot: TimeSlot;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CancelAppointmentDialog: React.FC<CancelAppointmentDialogProps> = ({
  slot,
  onConfirm,
  onCancel
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const dateObj = new Date();
    dateObj.setHours(Number(hour), Number(minute), 0, 0);
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(dateObj);
  };

  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  }).format(new Date(slot.date));

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('cancelAppointmentDialog.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Warning Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{t('cancelAppointmentDialog.warningLabel')}</strong> {t('cancelAppointmentDialog.warningText')}
          </AlertDescription>
        </Alert>

        {/* Appointment Details */}
        <Card className="p-4 bg-muted">
          <h3 className="font-semibold text-foreground mb-3">{t('cancelAppointmentDialog.appointmentHeading')}</h3>
          <div className="space-y-3">
            {slot.patientInfo && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{slot.patientInfo.name}</p>
                  <p className="text-sm text-muted-foreground">{slot.patientInfo.phone}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('cancelAppointmentDialog.patientMeta', { age: slot.patientInfo.age, gender: slot.patientInfo.gender })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatTime(slot.time)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Confirmation Question */}
        <div className="text-center py-4">
          <p className="text-foreground font-medium mb-2">
            {t('cancelAppointmentDialog.confirmQuestion')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('cancelAppointmentDialog.confirmHint')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            {t('cancelAppointmentDialog.keep')}
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1"
          >
            {t('cancelAppointmentDialog.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};