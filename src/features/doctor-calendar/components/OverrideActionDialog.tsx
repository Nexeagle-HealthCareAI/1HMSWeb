import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, X, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface OverrideActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onUpdate: () => void;
  overrideData?: {
    overrideId: string;
    shiftName: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  isPending: boolean;
}

export const OverrideActionDialog: React.FC<OverrideActionDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onUpdate,
  overrideData,
  isPending
}) => {
  // Debug logging
  React.useEffect(() => {
    if (isOpen && overrideData) {
      console.log('OverrideActionDialog opened with data:', overrideData);
    }
  }, [isOpen, overrideData]);
  
  if (!overrideData) {
    console.warn('OverrideActionDialog: No override data provided');
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
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            Override Schedule Options
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            What would you like to do with this override schedule?
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mb-4">
            <div className="font-medium text-blue-800 mb-1">Override Details:</div>
            <div className="text-blue-700 space-y-1">
              <div>• Shift: {overrideData.shiftName}</div>
              <div>• Date: {format(new Date(overrideData.date), 'EEEE, MMMM d, yyyy')}</div>
              <div>• Time: {formatTime(overrideData.startTime)} - {formatTime(overrideData.endTime)}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={onUpdate}>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Edit className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Update Override</div>
                <div className="text-sm text-gray-600">Modify the schedule details</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-red-50 cursor-pointer" onClick={onCancel}>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Cancel Override</div>
                <div className="text-sm text-gray-600">Remove and revert to default template</div>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            ⚠️ Canceling will permanently remove this override and revert to the default template schedule.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
