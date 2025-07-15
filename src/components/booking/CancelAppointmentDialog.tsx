import React from 'react';
import { AlertTriangle, Calendar, Clock, User } from 'lucide-react';
import { TimeSlot } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { format } from 'date-fns';

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
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Cancel Appointment
          </DialogTitle>
        </DialogHeader>

        {/* Warning Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Warning:</strong> This action cannot be undone. The appointment will be permanently cancelled and the time slot will become available for other patients.
          </AlertDescription>
        </Alert>

        {/* Appointment Details */}
        <Card className="p-4 bg-muted">
          <h3 className="font-semibold text-foreground mb-3">Appointment to Cancel</h3>
          <div className="space-y-3">
            {slot.patientInfo && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{slot.patientInfo.name}</p>
                  <p className="text-sm text-muted-foreground">{slot.patientInfo.phone}</p>
                  <p className="text-sm text-muted-foreground">
                    {slot.patientInfo.age} years old, {slot.patientInfo.gender}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(new Date(slot.date), 'EEEE, MMMM dd, yyyy')}
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
            Are you sure you want to cancel this appointment?
          </p>
          <p className="text-sm text-muted-foreground">
            The patient should be notified about the cancellation.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Keep Appointment
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1"
          >
            Yes, Cancel Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};