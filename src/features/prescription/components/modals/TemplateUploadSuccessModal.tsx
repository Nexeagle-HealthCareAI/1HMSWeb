import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface TemplateUploadSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
}

export const TemplateUploadSuccessModal = ({ open, onOpenChange, message }: TemplateUploadSuccessModalProps) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('prescriptionDesigner.messages.templateUploadedTitle')}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
