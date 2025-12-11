import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface CancelOverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  overrideData?: {
    overrideId: string;
    shiftName: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  isPending: boolean;
}

export const CancelOverrideDialog: React.FC<CancelOverrideDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  overrideData,
  isPending
}) => {
  const { t } = useTranslation();
  // Debug logging
  React.useEffect(() => {
    if (isOpen && overrideData) {
      console.log('CancelOverrideDialog opened with data:', overrideData);
    }
  }, [isOpen, overrideData]);
  
  if (!overrideData) {
    if (isOpen) {
      console.warn('CancelOverrideDialog: No override data provided');
    }
    return null;
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? t('calendar.time.pm') : t('calendar.time.am');
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <X className="h-4 w-4 text-red-600" />
            </div>
            {t('doctorCalendar.cancelOverrideDialog.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            {t('doctorCalendar.cancelOverrideDialog.description')}
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-red-800 mb-1">
              {t('doctorCalendar.cancelOverrideDialog.detailsTitle')}
            </div>
            <div className="text-red-700 space-y-1">
              <div>
                • {t('doctorCalendar.cancelOverrideDialog.shiftLabel')}: {overrideData.shiftName}
              </div>
              <div>
                • {t('doctorCalendar.cancelOverrideDialog.dateLabel')}: {format(new Date(overrideData.date), 'EEEE, MMMM d, yyyy')}
              </div>
              <div>
                • {t('doctorCalendar.cancelOverrideDialog.timeLabel')}: {formatTime(overrideData.startTime)} - {formatTime(overrideData.endTime)}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-red-600 mt-3">
            {t('doctorCalendar.cancelOverrideDialog.warning')}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            {t('doctorCalendar.cancelOverrideDialog.actions.keepOverride')}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending
              ? t('doctorCalendar.cancelOverrideDialog.actions.cancelling')
              : t('doctorCalendar.cancelOverrideDialog.actions.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

