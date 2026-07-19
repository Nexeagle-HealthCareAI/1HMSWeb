import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { OnboardedUsers } from './OnboardedUsers';
import { QuickAddUserForm } from './QuickAddUserForm';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionApi } from '@/features/subscription/hooks/useSubscriptionApi';
import { UsageLimitBadge } from '@/features/subscription/components/UsageLimitBadge';

/**
 * Team-member management. Onboarding is a direct "quick add" (no invitation links).
 */
export const UserManagement: React.FC = () => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const hospitalId = useAuthStore(state => state.hospitalId) || '';
  const { getUsage } = useSubscriptionApi();
  const { data: usage, isLoading: isUsageLoading } = getUsage(hospitalId);

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team members</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add and manage the people in this hospital.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Doctor headcount vs. this hospital's subscription plan limit */}
            <UsageLimitBadge label="Doctor Capacity" current={usage?.currentDoctors ?? 0} max={usage?.maxDoctors ?? null} isLoading={isUsageLoading} />
            <Button className="w-full sm:w-auto gap-2 shadow-md hover:shadow-lg transition-all" onClick={() => setShowQuickAdd(true)}>
              <UserPlus className="h-4 w-4" /> Add team member
            </Button>
          </div>
        </div>

        <OnboardedUsers />
      </div>

      <QuickAddUserForm open={showQuickAdd} onOpenChange={setShowQuickAdd} />
    </div>
  );
};
