import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { fetchAndStoreUserPermissions } from '@/features/auth/services/authApi';
import { getLandingPath } from '@/config/landing';

/**
 * Shown when a signed-in user has no board they are allowed to open (e.g. a role with no
 * permissions assigned yet). Replaces the old behaviour of silently logging such users out,
 * which looked like a broken login. Offers a permission refresh and an explicit sign-out.
 */
const NoAccessPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    const store = useAuthStore.getState();
    const userId = store.getUserId();
    const token = store.getToken();
    if (!userId || !token) {
      handleSignOut();
      return;
    }
    setRefreshing(true);
    setMessage(null);
    await fetchAndStoreUserPermissions(userId, token);
    const next = getLandingPath(store.getUserRoles(), store.getPermissions(), window.innerWidth < 1024);
    setRefreshing(false);
    if (next) {
      navigate(next, { replace: true });
    } else {
      setMessage(t('noAccess.stillNoAccess'));
    }
  };

  const handleSignOut = () => {
    useAuthStore.getState().logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <ShieldAlert className="h-14 w-14 mx-auto text-amber-500" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('noAccess.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('noAccess.description')}
          </p>
          {message && <p role="status" className="text-sm text-amber-600">{message}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('noAccess.checkAgain')}
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t('noAccess.signOut')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;
