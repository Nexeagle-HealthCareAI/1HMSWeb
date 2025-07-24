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
    const hasCompletedSetup = localStorage.getItem('easyHMS_setupCompleted');
    
    if (!hasCompletedSetup) {
      setCurrentState('welcome');
    } else {
      setCurrentState('dashboard');
    }
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
        
        // Check if profile is complete before allowing dashboard access
        const isProfileComplete = checkProfileCompletion(userRole);
        
        console.log('Index - Current user role:', userRole);
        console.log('Index - Profile complete:', isProfileComplete);
        
        // If profile not complete, force to welcome setup
        if (!isProfileComplete) {
          console.log('Index - Redirecting to setup due to incomplete profile');
          return (
            <WelcomeSetup
              onComplete={handleSetupComplete}
              onSkip={handleSetupSkip}
            />
          );
        }
        
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

  // Function to check if profile is complete enough for dashboard access
  const checkProfileCompletion = (userRole: string): boolean => {
    const setupData = localStorage.getItem('easyHMS_setupData');
    const hasCompleted = localStorage.getItem('easyHMS_setupCompleted');
    
    // If user marked setup as completed, allow access
    if (hasCompleted) return true;
    
    // If no setup data exists, profile is not complete
    if (!setupData) return false;
    
    const data = JSON.parse(setupData);
    
    // For admin users, check hospital registration completion
    if (userRole === 'admin') {
      const hospitalFields = [
        data.hospital?.name,
        data.hospital?.phone,
        data.hospital?.registrationNumber,
        data.hospital?.address,
      ];
      
      const completed = hospitalFields.filter(field => field && field.toString().trim() !== '').length;
      const hospitalScore = Math.round((completed / hospitalFields.length) * 100);
      
      console.log('Admin hospital completion score:', hospitalScore);
      return hospitalScore >= 70; // Require 70% completion for dashboard access
    }
    
    // For admin-doctor users, check both hospital and doctor fields
    if (userRole === 'admin-doctor') {
      const hospitalFields = [
        data.hospital?.name,
        data.hospital?.phone,
        data.hospital?.registrationNumber,
        data.hospital?.address,
      ];
      
      const doctorFields = [
        data.doctor?.fullName,
        data.doctor?.specialization,
        data.doctor?.licenseNumber,
        data.doctor?.qualification,
      ];
      
      const hospitalComplete = hospitalFields.filter(field => field && field.toString().trim() !== '').length;
      const doctorComplete = doctorFields.filter(field => field && field.toString().trim() !== '').length;
      
      const hospitalScore = (hospitalComplete / hospitalFields.length) * 50;
      const doctorScore = (doctorComplete / doctorFields.length) * 50;
      const totalScore = Math.round(hospitalScore + doctorScore);
      
      console.log('Admin-doctor completion score:', totalScore);
      return totalScore >= 70; // Require 70% completion for dashboard access
    }
    
    // For doctors and other staff, check doctor profile completion
    const doctorFields = [
      data.doctor?.fullName,
      data.doctor?.specialization,
      data.doctor?.licenseNumber,
      data.doctor?.qualification,
    ];
    
    const completed = doctorFields.filter(field => field && field.toString().trim() !== '').length;
    const doctorScore = Math.round((completed / doctorFields.length) * 100);
    
    console.log('Doctor profile completion score:', doctorScore);
    return doctorScore >= 70; // Require 70% completion for dashboard access
  };

  return renderCurrentView();
};

export default Index;
