import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface DeleteTimeOffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  timeOffData?: {
    reason: string;
    fromDate: string;
    toDate: string;
    timeOffId: string;
  };
  isPending: boolean;
}

export const DeleteTimeOffDialog: React.FC<DeleteTimeOffDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  timeOffData,
  isPending,
}) => {
  const { t } = useTranslation();
  console.log('🔍 DeleteTimeOffDialog props:', {
    isOpen,
    timeOffData,
    isPending
  });

  // Add more detailed logging
  React.useEffect(() => {
    console.log('🔍 DeleteTimeOffDialog useEffect - isOpen changed:', isOpen);
    if (isOpen) {
      console.log('🔍 DeleteTimeOffDialog is now OPEN with data:', timeOffData);
    }
  }, [isOpen, timeOffData]);
  const getDisplayDate = (dateStr: string, isEndDate = false) => {
    const d = new Date(dateStr);
    // If it is an end date exactly at midnight, subtract 1 minute to show the inclusive day
    if (isEndDate && d.getHours() === 0 && d.getMinutes() === 0) {
      return new Date(d.getTime() - 60000);
    }
    return d;
  };

  const formatDateTime = (dateStr: string, isEndDate = false) => {
    try {
      const d = getDisplayDate(dateStr, isEndDate);
      // If we adjusted it back from midnight, or if it exactly starts at midnight, just show the date
      if ((d.getHours() === 23 && d.getMinutes() === 59) || (d.getHours() === 0 && d.getMinutes() === 0)) {
        return format(d, 'MMM dd, yyyy');
      }
      return format(d, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch (error) {
      return dateStr;
    }
  };

  const isSameDay = (fromDate: string, toDate: string) => {
    try {
      const from = new Date(fromDate);
      const to = getDisplayDate(toDate, true);
      return from.toDateString() === to.toDateString();
    } catch (error) {
      return false;

    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-red-900">
              {t('doctorCalendar.deleteTimeOffDialog.title')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700">
            {t('doctorCalendar.deleteTimeOffDialog.description')}
          </DialogDescription>
        </DialogHeader>

        {timeOffData && (
          <div className="space-y-4">
            {/* Time Off Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t('doctorCalendar.deleteTimeOffDialog.detailsTitle')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('doctorCalendar.deleteTimeOffDialog.detailsSubtitle')}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {t('doctorCalendar.deleteTimeOffDialog.labels.reason')}
                  </span>
                  <span className="ml-2 text-sm text-gray-900">{timeOffData.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div className="text-sm">
                    {isSameDay(timeOffData.fromDate, timeOffData.toDate) ? (
                      <span className="text-gray-900">
                        {formatDate(timeOffData.fromDate)}
                      </span>
                    ) : (
                      <span className="text-gray-900">
                        {formatDateTime(timeOffData.fromDate)} - {formatDateTime(timeOffData.toDate, true)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-medium text-red-900">
                    {t('doctorCalendar.deleteTimeOffDialog.warning.title')}
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• {t('doctorCalendar.deleteTimeOffDialog.warning.bullet1')}</li>
                    <li>• {t('doctorCalendar.deleteTimeOffDialog.warning.bullet2')}</li>
                    <li>• {t('doctorCalendar.deleteTimeOffDialog.warning.bullet3')}</li>
                    <li>• {t('doctorCalendar.deleteTimeOffDialog.warning.bullet4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="flex-1"
          >
            {t('doctorCalendar.deleteTimeOffDialog.actions.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('doctorCalendar.deleteTimeOffDialog.actions.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('doctorCalendar.deleteTimeOffDialog.actions.delete')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
