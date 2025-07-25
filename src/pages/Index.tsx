import React, { useState, useEffect } from 'react';
import { Login } from '@/components/Login';
import { Registration } from '@/components/Registration';
import { Dashboard } from '@/components/Dashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import WelcomeSetup from '@/components/WelcomeSetup';

type AppState = 'login' | 'register' | 'welcome' | 'dashboard';

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('login');
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if user needs to see welcome setup
  useEffect(() => {
    const hasCompletedSetup = localStorage.getItem('easyHMS_setupCompleted');
    const isLoggedIn = localStorage.getItem('easyHMS_loggedIn');
    
    if (isLoggedIn && !hasCompletedSetup) {
      setShowWelcome(true);
    }
  }, [currentState]);

  const handleLogin = (userRole?: string) => {
    localStorage.setItem('easyHMS_loggedIn', 'true');
    if (userRole) {
      localStorage.setItem('easyHMS_userRole', userRole);
    }
    // Skip welcome setup and go directly to dashboard
    setCurrentState('dashboard');
  };

  const handleRegister = (userRole?: string) => {
    localStorage.setItem('easyHMS_loggedIn', 'true');
    if (userRole) {
      localStorage.setItem('easyHMS_userRole', userRole);
    }
    
    // For admin-doctor after quick registration, land on Admin Panel
    if (userRole === 'admin-doctor') {
      setCurrentState('dashboard'); // Will show AdminDashboard with setup requirements
    } else {
      setCurrentState('dashboard');
    }
  };

  const handleSetupComplete = (setupData: any) => {
    localStorage.setItem('easyHMS_setupCompleted', 'true');
    localStorage.setItem('easyHMS_setupData', JSON.stringify(setupData));
    setCurrentState('dashboard');
  };

  const handleSetupSkip = () => {
    localStorage.setItem('easyHMS_setupSkipped', 'true');
    setCurrentState('dashboard');
  };

  const handleLogout = () => {
    setCurrentState('login');
  };

  const renderCurrentView = () => {
    switch (currentState) {
      case 'login':
        return (
          <Login
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
      case 'welcome':
        return (
          <WelcomeSetup
            onComplete={handleSetupComplete}
            onSkip={handleSetupSkip}
          />
        );
      case 'dashboard':
        const userRole = localStorage.getItem('easyHMS_userRole') || 'doctor';
        
        // Debug info
        console.log('Index - Current user role:', userRole);
        console.log('Index - Should show AdminDashboard:', userRole === 'admin' || userRole === 'admin-doctor');
        
        // Admin and Admin-Doctor users see AdminDashboard
        if (userRole === 'admin' || userRole === 'admin-doctor') {
          return <AdminDashboard />;
        }
        
        // Regular doctors and staff see regular Dashboard
        return <Dashboard onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return renderCurrentView();
};

export default Index;
