import React from 'react';
import { CheckCircle, Calendar, Clock, User, Phone, Copy, Check, Printer } from 'lucide-react';
import { TimeSlot, Doctor } from './AppointmentBooking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface BookingSuccessProps {
  appointmentId: string;
  tokenNumber: string;
  doctor: Doctor;
  date: Date;
  timeSlot: TimeSlot | null;
  onBookAnother: () => void;
  onClose: () => void;
  open: boolean;
}

export const BookingSuccess: React.FC<BookingSuccessProps> = ({
  appointmentId,
  tokenNumber,
  doctor,
  date,
  timeSlot,
  onBookAnother,
  onClose,
  open
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

  const handleDone = () => {
    onClose();
    navigate('/appointment-dashboard');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Appointment Confirmation</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
              .print-container { max-width: 300px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 15px; }
              .hospital-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
              .appointment-details { font-size: 12px; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { font-weight: bold; }
              .value { text-align: right; }
              .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
              @page { margin: 10mm; size: A6; }
            }
            body { font-family: Arial, sans-serif; }
            .print-container { max-width: 300px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .hospital-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; color: #333; }
            .appointment-details { font-size: 12px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; }
            .label { font-weight: bold; color: #333; }
            .value { text-align: right; color: #666; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; border-top: 1px solid #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <div class="hospital-name">NexEagle Hospital</div>
              <div style="font-size: 10px; color: #666;">Appointment Confirmation</div>
            </div>
            
            <div class="appointment-details">
              <div class="detail-row">
                <span class="label">Token No:</span>
                <span class="value">${tokenNumber || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Appointment Date:</span>
                <span class="value">${format(date, 'dd/MM/yyyy')}</span>
              </div>
              <div class="detail-row">
                <span class="label">Doctor Name:</span>
                <span class="value">${doctor.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Specialization:</span>
                <span class="value">${doctor.specialization}</span>
              </div>
            </div>
            
            <div class="footer">
              <div>Generated on ${new Date().toLocaleDateString()}</div>
              <div>Thank you for choosing NexEagle Hospital</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 100);
    };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg dark:bg-gray-900">
        <DialogHeader className="relative pb-4">
          <DialogTitle className="text-center text-2xl font-bold text-green-600 dark:text-green-400">
            Appointment Booked Successfully!
          </DialogTitle>
        </DialogHeader>

        <div className="text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Your appointment has been confirmed and scheduled
            </p>
          </div>

          {/* Appointment Details */}
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 mb-5">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Appointment ID:</span>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-700">
                  <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">{appointmentId}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    onClick={copyAppointmentId}
                  >
                    <Copy className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </Button>
                </div>
              </div>
              
              {tokenNumber && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Token Number:</span>
                  <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-green-200 dark:border-green-700">
                    <span className="font-mono font-bold text-sm text-green-700 dark:text-green-300">{tokenNumber}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 text-left">
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Doctor</p>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{doctor.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{doctor.specialization}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {format(date, 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {timeSlot && (
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Time</p>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{formatTime(timeSlot.time)}</p>
                    </div>
                  </div>
                )}

                {timeSlot?.patientInfo && (
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Patient</p>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{timeSlot.patientInfo.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{timeSlot.patientInfo.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>



          {/* Actions */}
          <div className="space-y-3 mt-4">            
            <Button
              onClick={handleDone}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
            >
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
            
            <Button
              onClick={() => {
                onClose();
                onBookAnother();
              }}
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Book Another Appointment
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Confirmation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};