import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShiftName, CreateOverridePayload } from '../api/types';
import { format, parseISO } from 'date-fns';

interface EditShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  shiftDate: string;
  shiftName: ShiftName;
  initialData?: {
    startTime: string;
    endTime: string;
    slotMinutes: number;
    maxPatients?: number | null;
    reason?: string | null;
  };
  onSave: (payload: CreateOverridePayload) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export const EditShiftModal: React.FC<EditShiftModalProps> = ({
  open,
  onOpenChange,
  doctorId,
  shiftDate,
  shiftName,
  initialData,
  onSave,
  onDelete,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '12:00',
    slotMinutes: '15'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        slotMinutes: initialData.slotMinutes.toString()
      });
    }
  }, [initialData]);

  const normalizedShiftDate = React.useMemo(() => {
    if (!shiftDate) return new Date();
    const parsed = shiftDate.includes('T') ? new Date(shiftDate) : new Date(`${shiftDate}T00:00:00`);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [shiftDate]);

  const getUTCDateISO = React.useCallback((date: Date) => {
    return new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0
    )).toISOString();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before submitting
    if (!isFormValid()) {
      return;
    }
    
    const overrideDate = new Date().toISOString();
    const shiftDateISO = getUTCDateISO(normalizedShiftDate);
    const startDate = shiftDateISO;
    const endDate = shiftDateISO;
    const hospitalId = ''; // Assume hospitalId is obtained from context or props
    
    const slotMinutesValue = Math.max(0, parseInt(formData.slotMinutes, 10) || 0);

    const payload: CreateOverridePayload = {
      doctorId,
      hospitalId,
      overrideDate,
      startDate,
      endDate,
      shiftDetails: [{
        shiftName,
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotDurationInMinutes: slotMinutesValue,
        recurringDays: []
      }]
    };
    
    onSave(payload);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      // Handle different date formats
      let date: Date;
      
      if (dateStr.includes('T')) {
        // ISO format
        date = parseISO(dateStr);
      } else {
        // YYYY-MM-DD format
        date = new Date(dateStr + 'T00:00:00');
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (error) {
      // Fallback to a simple format if parsing fails
      return dateStr || 'Unknown Date';
    }
  };

  const isFormValid = () => {
    try {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      
      // Check if dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return false;
      }
      
      const slotMinutesValue = parseInt(formData.slotMinutes, 10);
      const isSlotValid = Number.isInteger(slotMinutesValue) && slotMinutesValue >= 0;
      return start < end && isSlotValid;
    } catch (error) {
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            Edit {shiftName} Shift - {formatDate(shiftDate || new Date().toISOString().split('T')[0])}
          </DialogTitle>
        </DialogHeader>
        
        <div className="rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-700 px-4 py-3 mb-4">
          Changes apply only to this specific shift on the selected date. Your default weekly schedule remains unchanged.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overrideDate">Override Date</Label>
              <Input
                id="overrideDate"
                value={formatDate(new Date().toISOString())}
                readOnly
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                value={formatDate(normalizedShiftDate.toISOString())}
                readOnly
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                value={formatDate(normalizedShiftDate.toISOString())}
                readOnly
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="slotMinutes">Slot Duration (minutes)</Label>
            <Input
              id="slotMinutes"
              type="number"
              min="0"
              step="1"
              value={formData.slotMinutes}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty input, but ensure only digits are stored
                if (value === '' || /^\d+$/.test(value)) {
                  setFormData(prev => ({ ...prev, slotMinutes: value }));
                }
              }}
              placeholder="Enter any integer"
            />
          </div>
          
          <DialogFooter className="gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                Delete Override
              </Button>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
