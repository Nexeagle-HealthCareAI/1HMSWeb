import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface LayoutSaveSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export const LayoutSaveSuccessModal = ({ open, onOpenChange, message }: LayoutSaveSuccessModalProps) => {
  const { t } = useTranslation();
  const displayMessage = message || t('prescriptionDesigner.messages.layoutSaved');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('prescriptionDesigner.messages.layoutSavedTitle')}</DialogTitle>
          <DialogDescription>{displayMessage}</DialogDescription>
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
