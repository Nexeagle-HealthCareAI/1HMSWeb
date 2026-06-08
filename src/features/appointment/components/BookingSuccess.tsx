import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Calendar, Clock, User, Phone, Copy, Check, Printer } from 'lucide-react';
import { TimeSlot, Doctor } from './AppointmentBooking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const locale = i18n.language || 'en';

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const dateObj = new Date();
    dateObj.setHours(Number(hour), Number(minute), 0, 0);
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(dateObj);
  };

  const formattedDisplayDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(date);

  const formattedPrintDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);

  const formattedGeneratedOn = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());

  const copyAppointmentId = () => {
    navigator.clipboard.writeText(appointmentId);
    toast({
      title: t('bookingSuccess.copyToastTitle'),
      description: t('bookingSuccess.copyToastDescription'),
    });
  };

  const handleDone = () => {
    onClose();
    navigate('/appointment-dashboard');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hospitalName = t('bookingSuccess.printTemplate.hospitalName');
    const confirmationTitle = t('bookingSuccess.printTemplate.title');
    const tokenLabel = t('bookingSuccess.printTemplate.tokenLabel');
    const appointmentDateLabel = t('bookingSuccess.printTemplate.appointmentDate');
    const doctorNameLabel = t('bookingSuccess.printTemplate.doctorName');
    const specializationLabel = t('bookingSuccess.printTemplate.specialization');
    const generatedOnText = t('bookingSuccess.printTemplate.generatedOn', { date: formattedGeneratedOn });
    const thankYouText = t('bookingSuccess.printTemplate.thankYou');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${confirmationTitle}</title>
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
              <div class="hospital-name">${hospitalName}</div>
              <div style="font-size: 10px; color: #666;">${confirmationTitle}</div>
            </div>
            
            <div class="appointment-details">
              <div class="detail-row">
                <span class="label">${tokenLabel}</span>
                <span class="value">${tokenNumber || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">${appointmentDateLabel}</span>
                <span class="value">${formattedPrintDate}</span>
              </div>
              <div class="detail-row">
                <span class="label">${doctorNameLabel}</span>
                <span class="value">${doctor.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">${specializationLabel}</span>
                <span class="value">${doctor.specialization}</span>
              </div>
            </div>
            
            <div class="footer">
              <div>${generatedOnText}</div>
              <div>${thankYouText}</div>
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
      <DialogContent className="max-w-xs w-full p-4 rounded-xl dark:bg-gray-900" style={{ minWidth: 340, minHeight: 420 }}>
        <DialogHeader className="relative pb-2">
          <DialogTitle className="text-center text-lg font-bold text-green-600 dark:text-green-400">
            {t('bookingSuccess.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center flex flex-col items-center justify-center">
          {/* Success Icon */}
          <div className="mb-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-2">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              {t('bookingSuccess.subtitle')}
            </p>
          </div>

          {/* Appointment Details */}
          <Card className="p-3 bg-gradient-to-br from-brand-50 to-brand-50 dark:from-brand-900/20 dark:to-brand-900/20 border-brand-200 dark:border-brand-800 mb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{t('bookingSuccess.idLabel')}</span>
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded px-2 py-1 border border-brand-200 dark:border-brand-700">
                  <span className="font-mono font-bold text-xs text-brand-700 dark:text-brand-300">{appointmentId}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 p-0 hover:bg-brand-100 dark:hover:bg-brand-900/30"
                    onClick={copyAppointmentId}
                  >
                    <Copy className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                  </Button>
                </div>
              </div>
              {tokenNumber && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">{t('bookingSuccess.tokenLabel')}</span>
                  <div className="bg-white dark:bg-gray-800 rounded px-2 py-1 border border-green-200 dark:border-green-700">
                    <span className="font-mono font-bold text-xs text-green-700 dark:text-green-300">{tokenNumber}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 text-left">
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <div className="p-1 bg-brand-100 dark:bg-brand-900/30 rounded">
                    <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('bookingSuccess.doctorLabel')}</p>
                    <p className="font-semibold text-xs text-gray-900 dark:text-gray-100">{doctor.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{doctor.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('bookingSuccess.dateLabel')}</p>
                    <p className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                      {formattedDisplayDate}
                    </p>
                  </div>
                </div>
                {timeSlot && (
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('bookingSuccess.timeLabel')}</p>
                      <p className="font-semibold text-xs text-gray-900 dark:text-gray-100">{formatTime(timeSlot.time)}</p>
                    </div>
                  </div>
                )}
                {timeSlot?.patientInfo && (
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                      <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('bookingSuccess.patientLabel')}</p>
                      <p className="font-semibold text-xs text-gray-900 dark:text-gray-100">{timeSlot.patientInfo.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('bookingSuccess.patientPhone')}: {timeSlot.patientInfo.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-2 mt-2 w-full">            
            <Button
              onClick={handleDone}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 text-sm"
            >
              <Check className="h-4 w-4 mr-2" />
              {t('bookingSuccess.done')}
            </Button>
            <Button
              onClick={() => {
                onClose();
                onBookAnother();
              }}
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
            >
              {t('bookingSuccess.bookAnother')}
            </Button>
            <Button
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('bookingSuccess.print')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};