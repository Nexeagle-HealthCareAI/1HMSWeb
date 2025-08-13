import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Users } from 'lucide-react';

interface InvitationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitedUserName: string;
  invitedUserEmail: string;
  invitedUserRole: string;
}

export const InvitationSuccessModal: React.FC<InvitationSuccessModalProps> = ({
  isOpen,
  onClose,
  invitedUserName,
  invitedUserEmail,
  invitedUserRole,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Invitation Sent Successfully!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2">Invitation Delivered</h3>
            <p className="text-muted-foreground mb-4">
              An invitation has been sent to the user. They will receive an email with registration instructions.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{invitedUserName}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Email: {invitedUserEmail}</div>
              <div>Role: {invitedUserRole}</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Next Steps:</strong> The user will receive an email with a registration link. 
              Once they complete registration, you can view them in the "Onboarded Users" tab.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onClose}>
              View Invited Users
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

