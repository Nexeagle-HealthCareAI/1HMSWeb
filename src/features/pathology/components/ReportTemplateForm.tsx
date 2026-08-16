import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyReportTemplate } from '../services/pathologyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface ReportTemplateFormProps {
  template: PathologyReportTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportTemplateForm: React.FC<ReportTemplateFormProps> = ({ template, isOpen, onClose, onSuccess }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      templateCode: '',
      templateName: '',
      headerBlobPath: '',
      footerText: '',
      isDefault: false,
      isActive: true,
      layoutJson: '{}'
    }
  });

  useEffect(() => {
    if (template) {
      reset({
        templateCode: template.templateCode,
        templateName: template.templateName,
        headerBlobPath: template.headerBlobPath || '',
        footerText: template.footerText || '',
        isDefault: template.isDefault,
        isActive: template.isActive,
        layoutJson: template.layoutJson || '{}'
      });
    } else {
      reset();
    }
  }, [template, reset]);

  const onSubmit = async (data: any) => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      
      const payload = {
        ...data
      };

      if (template) {
        await pathologyService.updateTemplate(hospitalId, template.templateId, { templateId: template.templateId, ...payload });
        toast.success("Template updated successfully");
      } else {
        await pathologyService.createTemplate(hospitalId, payload);
        toast.success("Template created successfully");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{template ? 'Edit Template' : 'New Template'}</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Code *</Label>
              <Input {...register('templateCode', { required: true })} placeholder="e.g. STD-REPORT" />
              {errors.templateCode && <span className="text-xs text-red-500">Required</span>}
            </div>
            
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input {...register('templateName', { required: true })} placeholder="Standard Pathology Report" />
              {errors.templateName && <span className="text-xs text-red-500">Required</span>}
            </div>
            
            <div className="space-y-2">
              <Label>Header Image URL / Blob Path</Label>
              <Input {...register('headerBlobPath')} placeholder="https://..." />
              <p className="text-xs text-gray-500">Provide an image URL to be placed at the top of the report.</p>
            </div>

            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Textarea 
                {...register('footerText')} 
                placeholder="Powered by Nexeagle..." 
                className="resize-none" 
                rows={3} 
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Controller
                name="isDefault"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Set as Default</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Active</Label>
            </div>
          </div>

          <SheetFooter className="mt-8">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Template'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
