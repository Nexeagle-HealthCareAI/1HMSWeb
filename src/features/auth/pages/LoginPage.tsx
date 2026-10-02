import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SecureLogin } from '@/features/auth/components/SecureLogin';
import { Registration } from '@/features/auth/components/Registration';
import { useIsAuthenticated } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { getLandingPath } from '@/config/landing';

type AppState = 'login' | 'register';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const [currentState, setCurrentState] = useState<AppState>('login');


  // Where to send the user once signed in: the page they originally asked for, else the landing
  // page resolved from their granted permissions (config/landing.ts). A user with no permitted
  // board goes to "/" which renders the "no access" screen (never a silent logout).
  const goAfterAuth = () => {
    const store = useAuthStore.getState();
    const intendedPath = location.state?.from?.pathname;
    if (intendedPath && intendedPath !== '/') {
      navigate(intendedPath);
      return;
    }
    const target = getLandingPath(store.getUserRoles(), store.getPermissions(), window.innerWidth < 1024);
    navigate(target ?? '/');
  };

  // Redirect already-authenticated visitors to their landing page.
  useEffect(() => {
    if (isAuthenticated && currentState === 'login') {
      goAfterAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentState, navigate, location.state]);

  const handleLogin = (userRole?: string) => {
    if (userRole) {
      useAuthStore.getState().setUserRole(userRole);
    }
    goAfterAuth();
  };

  const handleRegister = (userRole?: string) => {
    if (userRole) {
      useAuthStore.getState().setUserRole(userRole);
    }
    goAfterAuth();
  };

  const renderCurrentView = () => {
    switch (currentState) {
      case 'login':
        return (
          <SecureLogin
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentState('register')}
          />
        );
      case 'register':
        return (
          <Registration
            onRegister={handleRegister}
            onSwitchToLogin={() => setCurrentState('login')}
          />
        );     
      default:
        return (
          <SecureLogin
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentState('register')}
          />
        );
    }
  };

  return renderCurrentView();
};

export default LoginPage;
