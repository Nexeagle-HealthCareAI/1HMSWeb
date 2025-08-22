import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
    slotMinutes: 15,
    maxPatients: '',
    reason: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        slotMinutes: initialData.slotMinutes,
        maxPatients: initialData.maxPatients?.toString() || '',
        reason: initialData.reason || ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before submitting
    if (!isFormValid()) {
      return;
    }
    
    // Convert shiftDate to ISO format
    const overrideDate = new Date(shiftDate + 'T00:00:00').toISOString();
    const startDate = overrideDate;
    const endDate = overrideDate;
    
    const payload: CreateOverridePayload = {
      doctorId,
      shiftName,
      startTime: formData.startTime,
      endTime: formData.endTime,
      slotDuration: formData.slotMinutes,
      overrideDate,
      recurringDays: [],
      startDate,
      endDate,
      items: [{
        doctorId,
        shiftName,
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotDuration: formData.slotMinutes,
        overrideDate,
        recurringDays: [],
        startDate,
        endDate
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
      
      return start < end && formData.slotMinutes > 0;
    } catch (error) {
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Edit {shiftName} Shift - {formatDate(shiftDate || new Date().toISOString().split('T')[0])}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Select
              value={formData.slotMinutes.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, slotMinutes: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxPatients">Max Patients (optional)</Label>
            <Input
              id="maxPatients"
              type="number"
              min="1"
              value={formData.maxPatients}
              onChange={(e) => setFormData(prev => ({ ...prev, maxPatients: e.target.value }))}
              placeholder="Leave empty for unlimited"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Emergency meeting, Conference, etc."
              rows={3}
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
