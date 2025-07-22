import React, { useState } from 'react';
import { Login } from '@/components/Login';
import { Registration } from '@/components/Registration';
import { useNavigate } from 'react-router-dom';

type AppState = 'login' | 'register';

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('login');
  const navigate = useNavigate();

  const handleLogin = () => {
    // Redirect to the appointment scheduler with the new layout
    navigate('/appointment-scheduler');
  };

  const handleRegister = () => {
    // Redirect to the appointment scheduler with the new layout
    navigate('/appointment-scheduler');
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
      default:
        return null;
    }
  };

  return renderCurrentView();
};

export default Index;