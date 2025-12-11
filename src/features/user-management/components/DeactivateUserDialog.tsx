import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, UserX, Shield } from 'lucide-react';

interface DeactivateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userEmail: string;
  isPending: boolean;
}

export const DeactivateUserDialog: React.FC<DeactivateUserDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
  isPending,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-red-900">
              {t('userManagement.deactivateDialog.title')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700">
            {t('userManagement.deactivateDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{t('userManagement.deactivateDialog.userDetailsTitle')}</h4>
                <p className="text-sm text-gray-600">{t('userManagement.deactivateDialog.userDetailsSubtitle')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('userManagement.deactivateDialog.labels.name')}:</span>
                <span className="ml-2 text-sm text-gray-900">{userName}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">{t('userManagement.deactivateDialog.labels.email')}:</span>
                <span className="ml-2 text-sm text-gray-900">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="font-medium text-red-900">{t('userManagement.deactivateDialog.noticeTitle')}</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• {t('userManagement.deactivateDialog.noticeItems.access')}</li>
                  <li>• {t('userManagement.deactivateDialog.noticeItems.sessions')}</li>
                  <li>• {t('userManagement.deactivateDialog.noticeItems.reactivation')}</li>
                  <li>• {t('userManagement.deactivateDialog.noticeItems.reversible')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="flex-1"
          >
            {t('common.cancel')}
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
                {t('userManagement.deactivateDialog.deactivating')}
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-2" />
                {t('userManagement.deactivateDialog.confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
