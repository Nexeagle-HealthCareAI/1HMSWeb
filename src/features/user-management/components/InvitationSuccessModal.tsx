import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Users } from 'lucide-react';

interface InvitationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewInvitedUsers: () => void;
  invitedUserName: string;
  invitedUserEmail: string;
  invitedUserRole: string;
}

export const InvitationSuccessModal: React.FC<InvitationSuccessModalProps> = ({
  isOpen,
  onClose,
  onViewInvitedUsers,
  invitedUserName,
  invitedUserEmail,
  invitedUserRole,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t('userManagement.invitationSuccess.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2">{t('userManagement.invitationSuccess.deliveredTitle')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('userManagement.invitationSuccess.deliveredDescription')}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{invitedUserName}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>{t('userManagement.invitationSuccess.emailLabel')}: {invitedUserEmail}</div>
              <div>{t('userManagement.invitationSuccess.roleLabel')}: {invitedUserRole}</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>{t('userManagement.invitationSuccess.nextStepsTitle')}:</strong> {t('userManagement.invitationSuccess.nextStepsDescription')}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button onClick={onViewInvitedUsers}>
              {t('userManagement.viewInvitedUsers')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

