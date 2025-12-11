import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calendar, Clock, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface AppointmentCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  appointmentData?: {
    appointmentId: string;
    patientName: string;
    patientPhone?: string;
    patientAge?: number;
    patientGender?: string;
    date: string;
    time: string;
    tokenNumber?: string;
  };
  isPending: boolean;
}

export const AppointmentCancelDialog: React.FC<AppointmentCancelDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  appointmentData,
  isPending
}) => {
  const { t } = useTranslation();

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? t('appointmentCancelDialog.time.pm') : t('appointmentCancelDialog.time.am');
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  if (!appointmentData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('appointmentCancelDialog.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Warning Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{t('appointmentCancelDialog.warningLabel')}</strong>{' '}
            {t('appointmentCancelDialog.warningDescription')}
          </AlertDescription>
        </Alert>

        {/* Appointment Details */}
        <Card className="p-4 bg-muted">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{appointmentData.patientName}</p>
                {appointmentData.patientPhone && (
                  <p className="text-sm text-muted-foreground">{appointmentData.patientPhone}</p>
                )}
                {appointmentData.patientAge && appointmentData.patientGender && (
                  <p className="text-sm text-muted-foreground">
                    {t('appointmentCancelDialog.patientAgeGender', {
                      age: appointmentData.patientAge,
                      gender: appointmentData.patientGender
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(new Date(appointmentData.date), 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatTime(appointmentData.time)}</p>
              </div>
            </div>

            {appointmentData.tokenNumber && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {t('appointmentCancelDialog.tokenLabel', { token: appointmentData.tokenNumber })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Confirmation Question */}
        <div className="text-center py-4">
          <p className="text-foreground font-medium mb-2">
            {t('appointmentCancelDialog.confirmTitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('appointmentCancelDialog.confirmSubtitle')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="flex-1"
          >
            {t('appointmentCancelDialog.actions.keep')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending
              ? t('appointmentCancelDialog.actions.pending')
              : t('appointmentCancelDialog.actions.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
