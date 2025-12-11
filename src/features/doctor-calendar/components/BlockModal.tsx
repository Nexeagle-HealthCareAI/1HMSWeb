import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BlockType, CreateBlockPayload } from '../api/types';
import { format } from 'date-fns';

interface BlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  initialStartDateTime?: string;
  initialEndDateTime?: string;
  onSave: (payload: CreateBlockPayload) => void;
  isLoading?: boolean;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  open,
  onOpenChange,
  doctorId,
  initialStartDateTime,
  initialEndDateTime,
  onSave,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    blockType: 'Leave' as BlockType,
    startDateTime: '',
    endDateTime: ''
  });

  useEffect(() => {
    if (initialStartDateTime && initialEndDateTime) {
      setFormData(prev => ({
        ...prev,
        startDateTime: format(new Date(initialStartDateTime), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(new Date(initialEndDateTime), "yyyy-MM-dd'T'HH:mm")
      }));
    } else {
      // Default to today with reasonable times
      const today = new Date();
      const startTime = new Date(today);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(today);
      endTime.setHours(17, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        startDateTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(endTime, "yyyy-MM-dd'T'HH:mm")
      }));
    }
  }, [initialStartDateTime, initialEndDateTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: CreateBlockPayload = {
      doctorId,
      title: formData.title,
      blockType: formData.blockType,
      startDateTime: new Date(formData.startDateTime).toISOString(),
      endDateTime: new Date(formData.endDateTime).toISOString()
    };
    
    onSave(payload);
  };

  const isFormValid = () => {
    if (!formData.title.trim()) return false;
    
    const start = new Date(formData.startDateTime);
    const end = new Date(formData.endDateTime);
    
    return start < end && !isNaN(start.getTime()) && !isNaN(end.getTime());
  };

  const getBlockTypeColor = (blockType: BlockType) => {
    switch (blockType) {
      case 'Leave': return 'text-red-600';
      case 'Personal': return 'text-orange-600';
      case 'Surgery': return 'text-purple-600';
      case 'Admin': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('blockModal.title')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('blockModal.fields.titleLabel')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('blockModal.fields.titlePlaceholder')}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blockType">{t('blockModal.fields.blockTypeLabel')}</Label>
            <Select
              value={formData.blockType}
              onValueChange={(value: BlockType) => setFormData(prev => ({ ...prev, blockType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Leave" className={getBlockTypeColor('Leave')}>
                  {t('blockModal.fields.blockType.leave')}
                </SelectItem>
                <SelectItem value="Personal" className={getBlockTypeColor('Personal')}>
                  {t('blockModal.fields.blockType.personal')}
                </SelectItem>
                <SelectItem value="Surgery" className={getBlockTypeColor('Surgery')}>
                  {t('blockModal.fields.blockType.surgery')}
                </SelectItem>
                <SelectItem value="Admin" className={getBlockTypeColor('Admin')}>
                  {t('blockModal.fields.blockType.admin')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDateTime">{t('blockModal.fields.startLabel')}</Label>
              <Input
                id="startDateTime"
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDateTime">{t('blockModal.fields.endLabel')}</Label>
              <Input
                id="endDateTime"
                type="datetime-local"
                value={formData.endDateTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endDateTime: e.target.value }))}
                required
              />
            </div>
          </div>
          
          {formData.startDateTime && formData.endDateTime && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <div className="font-medium">{t('blockModal.fields.durationLabel')}</div>
                <div>
                  {format(new Date(formData.startDateTime), 'MMM dd, yyyy HH:mm')} - {format(new Date(formData.endDateTime), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('blockModal.actions.cancel')}
            </Button>
            
            <Button
              type="submit"
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? t('blockModal.actions.pending') : t('blockModal.actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
