import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SecureLogin } from '@/features/auth/components/SecureLogin';
import { Registration } from '@/features/auth/components/Registration';
import { useIsAuthenticated } from '@/store';
import { useAuthStore } from '@/store/authStore';

type AppState = 'login' | 'register';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const [currentState, setCurrentState] = useState<AppState>('login');


//Note: Current Implementation is focused on Admin Doctor and Admin Prespective.
// We have to update landing page based on  user role assigned.


  // Note: Authentication clearing is now handled by the route guard
  // This ensures proper session management without clearing on every visit

  // Redirect authenticated users to appropriate dashboard based on role
  useEffect(() => {
    if (isAuthenticated && currentState === 'login') {
      const authStore = useAuthStore.getState();
      const userRole = authStore.getUserRole();
      const intendedPath = location.state?.from?.pathname;
      
      if (intendedPath && intendedPath !== '/') {
        // Redirect to the originally requested page
        navigate(intendedPath);
      } else if (userRole === 'Admin' || userRole === 'AdminDoctor') {
        navigate('/admin');
      } else if (userRole === 'Receptionist' || userRole === 'Nurse') {
        navigate('/appointment-dashboard');
      } else if (userRole === 'Doctor') {
        navigate('/dashboard');
      } else {
        // Default fallback
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, currentState, navigate, location.state]);

  const handleLogin = (userRole?: string) => {
    const authStore = useAuthStore.getState();
    if (userRole) {
      authStore.setUserRole(userRole);
    }
    
    // Get the user role from the store if not provided as parameter
    const currentUserRole = userRole || authStore.getUserRole();
    
    // Navigate to appropriate dashboard based on role
    const intendedPath = location.state?.from?.pathname;
    if (intendedPath && intendedPath !== '/') {
      navigate(intendedPath);
    } else if (currentUserRole === 'Admin' || currentUserRole === 'AdminDoctor') {
      navigate('/admin');
    } else if (currentUserRole === 'Receptionist' || currentUserRole === 'Nurse') {
      navigate('/appointment-dashboard');
    } else if (currentUserRole === 'Doctor') {
      navigate('/dashboard');
    } else {
      // Default fallback
      navigate('/dashboard');
    }
  };

  const handleRegister = (userRole?: string) => {
    const authStore = useAuthStore.getState();
    if (userRole) {
      authStore.setUserRole(userRole);
    }
    
    // Navigate to appropriate dashboard based on role
    const intendedPath = location.state?.from?.pathname;
    if (intendedPath && intendedPath !== '/') {
      navigate(intendedPath);
    } else if (userRole === 'Admin') {
      navigate('/admin');
    } else if (userRole === 'AdminDoctor') {
      navigate('/admin');
    } else if (userRole === 'Receptionist' || userRole === 'Nurse') {
      navigate('/appointment-dashboard');
    } else if (userRole === 'Doctor') {
      navigate('/dashboard');
    } else {
      // Default fallback - check stored role
      const storedRole = authStore.getUserRole();
      if (storedRole === 'Admin') {
        navigate('/admin');
      } else if (storedRole === 'Receptionist' || storedRole === 'Nurse') {
        navigate('/appointment-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
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
