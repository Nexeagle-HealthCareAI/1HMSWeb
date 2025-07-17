import React, { useState } from 'react';
import { Login } from '@/components/Login';
import { Registration } from '@/components/Registration';
import { Dashboard } from '@/components/Dashboard';

type AppState = 'login' | 'register' | 'dashboard';

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('login');

  const handleLogin = () => {
    setCurrentState('dashboard');
  };

  const handleRegister = () => {
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
      case 'dashboard':
        return <Dashboard onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return renderCurrentView();
};

export default Index;
