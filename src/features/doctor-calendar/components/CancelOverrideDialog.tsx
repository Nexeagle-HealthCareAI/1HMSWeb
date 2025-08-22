import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';

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
  // Debug logging
  React.useEffect(() => {
    if (isOpen && overrideData) {
      console.log('CancelOverrideDialog opened with data:', overrideData);
    }
  }, [isOpen, overrideData]);
  
  if (!overrideData) {
    console.warn('CancelOverrideDialog: No override data provided');
    return null;
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
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
            Cancel Shift Override
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Are you sure you want to cancel this shift override? This will remove the personalized schedule and revert to the default template.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-red-800 mb-1">Override Details:</div>
            <div className="text-red-700 space-y-1">
              <div>• Shift: {overrideData.shiftName}</div>
              <div>• Date: {format(new Date(overrideData.date), 'EEEE, MMMM d, yyyy')}</div>
              <div>• Time: {formatTime(overrideData.startTime)} - {formatTime(overrideData.endTime)}</div>
            </div>
          </div>
          
          <p className="text-xs text-red-600 mt-3">
            ⚠️ This action cannot be undone. The shift will revert to the default template schedule.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Keep Override
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? 'Canceling...' : 'Yes, Cancel Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

