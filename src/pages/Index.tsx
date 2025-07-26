import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureLogin } from '@/components/SecureLogin';
import { Registration } from '@/components/Registration';
import { useAuth } from '@/contexts/AuthContext';

type AppState = 'login' | 'register';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('login');



  // Clear authentication state when visiting root path to ensure fresh login
  useEffect(() => {
    if (window.location.pathname === '/') {
      // Clear any existing authentication state
      localStorage.removeItem('easyHMS_loggedIn');
      localStorage.removeItem('easyHMS_userRole');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('tokenExpiry');
      sessionStorage.removeItem('user');
    }
  }, []);

  // Redirect authenticated users to dashboard only if they're on the login page
  useEffect(() => {
    if (isAuthenticated && currentState === 'login') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, currentState, navigate]);

  const handleLogin = (userRole?: string) => {
    localStorage.setItem('easyHMS_loggedIn', 'true');
    if (userRole) {
      localStorage.setItem('easyHMS_userRole', userRole);
    }
    // Navigate to admin after successful login
    navigate('/admin');
  };

  const handleRegister = (userRole?: string) => {
    localStorage.setItem('easyHMS_loggedIn', 'true');
    if (userRole) {
      localStorage.setItem('easyHMS_userRole', userRole);
    }
    
    // Navigate to dashboard after successful registration
    navigate('/admin');
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

export default Index;
