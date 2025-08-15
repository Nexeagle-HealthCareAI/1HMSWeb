import React from 'react';
import { Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store';

// Lazy load public components
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage').then(module => ({ default: module.default })));
const UserOnboardingRegistration = React.lazy(() => import('@/features/auth/components/UserOnboardingRegistration').then(module => ({ default: module.default })));
const NotFoundPage = React.lazy(() => import('@/components/shared/NotFoundPage').then(module => ({ default: module.default })));

// Role-based redirect component
const RoleBasedRedirect = () => {
  const { getUserRole } = useAuthStore.getState();
  const userRole = getUserRole();
  
  if (userRole === 'Admin') {
    return <Navigate to="/easyHMS/admin" replace />;
  } else if (userRole === 'Doctor' || userRole === 'AdminDoctor') {
    return <Navigate to="/easyHMS/dashboard" replace />;
  } else if (userRole === 'Receptionist' || userRole === 'Nurse') {
    return <Navigate to="/easyHMS/appointment-dashboard" replace />;
  } else {
    return <Navigate to="/easyHMS/" replace />;
  }
};

interface PublicRoutesProps {
  isAuthenticated: boolean;
}

export const PublicRoutes: React.FC<PublicRoutesProps> = ({ isAuthenticated }) => {
  return (
    <>
      {/* User Onboarding - Always accessible */}
      <Route 
        path="/easyHMS/user-onboarding" 
        element={<UserOnboardingRegistration />} 
      />

      {/* Login Route */}
      <Route 
        path="/easyHMS/login" 
        element={
          isAuthenticated ? (
            <RoleBasedRedirect />
          ) : (
            <LoginPage />
          )
        } 
      />

      {/* 404 Route */}
      <Route 
        path="/easyHMS/404" 
        element={<NotFoundPage />} 
      />

      {/* Root Route */}
      <Route 
        path="/easyHMS/" 
        element={
          isAuthenticated ? (
            <RoleBasedRedirect />
          ) : (
            <Navigate to="/easyHMS/login" replace />
          )
        } 
      />
    </>
  );
};
