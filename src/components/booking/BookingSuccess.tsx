import React from 'react';
import { CheckCircle, Calendar, Clock, User, Phone, Copy, ArrowLeft } from 'lucide-react';
import { TimeSlot, Doctor } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface BookingSuccessProps {
  appointmentId: string;
  doctor: Doctor;
  date: Date;
  timeSlot: TimeSlot | null;
  onBookAnother: () => void;
}

export const BookingSuccess: React.FC<BookingSuccessProps> = ({
  appointmentId,
  doctor,
  date,
  timeSlot,
  onBookAnother
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const copyAppointmentId = () => {
    navigator.clipboard.writeText(appointmentId);
    toast({
      title: "Copied!",
      description: "Appointment ID copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center shadow-elegant">
        {/* Success Icon */}
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-healthcare-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-healthcare-success mb-2">
            Appointment Booked Successfully!
          </h1>
          <p className="text-muted-foreground">
            Your appointment has been confirmed
          </p>
        </div>

        {/* Appointment Details */}
        <Card className="p-6 bg-gradient-primary text-white mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm opacity-75">Appointment ID:</span>
              <div className="flex items-center gap-2 bg-white/20 rounded px-3 py-1">
                <span className="font-mono font-bold">{appointmentId}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-white/20"
                  onClick={copyAppointmentId}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-left">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5" />
                <div>
                  <p className="text-sm opacity-75">Doctor</p>
                  <p className="font-semibold">{doctor.name}</p>
                  <p className="text-xs opacity-75">{doctor.specialization}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div>
                  <p className="text-sm opacity-75">Date</p>
                  <p className="font-semibold">
                    {format(date, 'EEEE, MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {timeSlot && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-75">Time</p>
                    <p className="font-semibold">{formatTime(timeSlot.time)}</p>
                  </div>
                </div>
              )}

              {timeSlot?.patientInfo && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-75">Patient</p>
                    <p className="font-semibold">{timeSlot.patientInfo.name}</p>
                    <p className="text-xs opacity-75">{timeSlot.patientInfo.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-muted mb-6 text-left">
          <h3 className="font-semibold text-foreground mb-2">Important Notes:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Please arrive 15 minutes before your appointment</li>
            <li>• Bring a valid ID and insurance card</li>
            <li>• Contact us if you need to reschedule</li>
            <li>• Save your appointment ID for reference</li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-healthcare-primary hover:bg-healthcare-primary/90"
            size="lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => {/* Edit appointment */}}
              variant="outline"
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              size="sm"
            >
              Edit
            </Button>
            
            <Button
              onClick={() => {/* Reschedule appointment */}}
              variant="outline"
              className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
              size="sm"
            >
              Reschedule
            </Button>
            
            <Button
              onClick={() => {/* Cancel appointment */}}
              variant="outline"
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              size="sm"
            >
              Cancel
            </Button>
          </div>
          
          <Button
            onClick={onBookAnother}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Book Another Appointment
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.print()}
          >
            Print Confirmation
          </Button>
        </div>
      </Card>
    </div>
  );
};