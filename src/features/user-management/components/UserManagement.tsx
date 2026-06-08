import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { OnboardedUsers } from './OnboardedUsers';
import { QuickAddUserForm } from './QuickAddUserForm';

/**
 * Team-member management. Onboarding is a direct "quick add" (no invitation links).
 */
export const UserManagement: React.FC = () => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto bg-gray-50/50 dark:bg-black/20 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team members</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add and manage the people in this hospital.</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => setShowQuickAdd(true)}>
            <UserPlus className="h-4 w-4" /> Add team member
          </Button>
        </div>

        <OnboardedUsers />
      </div>

      <QuickAddUserForm open={showQuickAdd} onOpenChange={setShowQuickAdd} />
    </div>
  );
};
