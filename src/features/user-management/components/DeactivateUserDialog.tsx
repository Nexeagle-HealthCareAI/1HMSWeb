import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmName('');
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[500px] border-l border-red-100 dark:border-red-900/30 flex flex-col h-full bg-white dark:bg-slate-950 p-0 gap-0">
        <div className="px-6 py-5 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
          <SheetHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <SheetTitle className="text-xl font-semibold text-red-900 dark:text-red-400">
                {t('userManagement.deactivateDialog.title')}
              </SheetTitle>
            </div>
            <SheetDescription className="text-sm text-red-800/80 dark:text-red-300/80 text-left mt-1">
              {t('userManagement.deactivateDialog.description')}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-slate-900/10">
          {/* User Information */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-3">
              <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/50 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{t('userManagement.deactivateDialog.userDetailsTitle')}</h4>
                <p className="text-xs text-slate-500">{t('userManagement.deactivateDialog.userDetailsSubtitle')}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('userManagement.deactivateDialog.labels.name')}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{userName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('userManagement.deactivateDialog.labels.email')}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1.5">
                <h4 className="font-semibold text-red-900 dark:text-red-400 text-sm">{t('userManagement.deactivateDialog.noticeTitle')}</h4>
                <ul className="text-xs text-red-800 dark:text-red-300/80 space-y-1.5 list-disc pl-4">
                  <li>{t('userManagement.deactivateDialog.noticeItems.access')}</li>
                  <li>{t('userManagement.deactivateDialog.noticeItems.sessions')}</li>
                  <li>{t('userManagement.deactivateDialog.noticeItems.reactivation')}</li>
                  <li>{t('userManagement.deactivateDialog.noticeItems.reversible')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Type <span className="font-bold text-red-600 dark:text-red-400 select-all">{userName}</span> to confirm
              </Label>
              <p className="text-[11px] text-slate-500">This action cannot be undone.</p>
            </div>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={userName}
              className="h-10 border-slate-300 dark:border-slate-700 focus-visible:ring-red-500/50 text-sm"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-950 flex gap-3 mt-auto">
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
            disabled={isPending || confirmName !== userName}
            className="flex-1 shadow-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
