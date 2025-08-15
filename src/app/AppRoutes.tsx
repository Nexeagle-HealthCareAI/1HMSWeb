import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useAuthLoading, useAuthStore } from '@/store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MainLayout } from '@/components/layout/MainLayout';
import { RouteGuard } from '@/components/guards/RouteGuard';

// Role-based redirect component
const RoleBasedRedirect = () => {
  const userRole = useAuthStore.getState().getUserRole();
  
  if (userRole === 'Admin') {
    return <Navigate to="/admin" replace />;
  } else if (userRole === 'Doctor' || userRole === 'AdminDoctor') {
    return <Navigate to="/dashboard" replace />;
  } else if (userRole === 'Receptionist' || userRole === 'Nurse') {
    // Receptionist and Nurse should go to appointment dashboard
    return <Navigate to="/appointment-dashboard" replace />;
  } else {
    // Default fallback - redirect to login if role is not recognized
    return <Navigate to="/" replace />;
  }
};

// Lazy load pages for better performance
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(module => ({ default: module.default })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const ClinicalDashboard = lazy(() => import('@/features/doctor/components/DocBoard').then(module => ({ default: module.ClinicalDashboard })));
const AppointmentDashboard = lazy(() => import('@/features/appointment/components/AppointmentDashboard').then(module => ({ default: module.AppointmentDashboard })));
const AppointmentBooking = lazy(() => import('@/features/appointment/components/AppointmentBooking').then(module => ({ default: module.AppointmentBooking })));
const AppointmentOversight = lazy(() => import('@/features/appointment/components/AppointmentOversight').then(module => ({ default: module.AppointmentOversight })));

const DocAI = lazy(() => import('@/features/ai/components/DocAI').then(module => ({ default: module.DocAI })));
const ProfilePage = lazy(() => import('@/features/profile/components/ProfilePage').then(module => ({ default: module.ProfilePage })));
const Billing = lazy(() => import('@/features/billing/components/Billing').then(module => ({ default: module.Billing })));
const UserOnboardingRegistration = lazy(() => import('@/features/auth/components/UserOnboardingRegistration').then(module => ({ default: module.default })));
const CanvasPage = lazy(() => import('@/pages/admin/prescriptions/canvas').then(module => ({ default: module.default })));
const NotFoundPage = lazy(() => import('@/components/shared/NotFoundPage').then(module => ({ default: module.default })));


// Loading component for lazy routes
const RouteLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const { isTokenValid, logout } = useAuthStore();

  // Note: We don't automatically clear invalid tokens on app startup
  // Authentication state is preserved across browser refreshes
  // Users will only be logged out when they explicitly logout or when token expires during active session

  // Check if user is authenticated - on refresh, we trust the persisted state
  // Only validate token during active sessions, not on page refresh
  const isActuallyAuthenticated = isAuthenticated;


  // Show loading spinner while checking authentication
  // Temporarily disable loading check to fix login issue
  // if (isLoading === true) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
  //       <div className="text-center space-y-4">
  //         <LoadingSpinner size="lg" />
  //         <p className="text-muted-foreground">Checking authentication...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <Suspense fallback={<RouteLoadingSpinner />}>
      <Routes>
        {/* Public Routes - No Authentication Required */}
        <Route 
          path="/user-onboarding" 
          element={<UserOnboardingRegistration />} 
        />

        <Route 
          path="/login" 
          element={
            isActuallyAuthenticated ? (
              <RoleBasedRedirect />
            ) : (
              <LoginPage />
            )
          } 
        />

        <Route 
          path="/404" 
          element={<NotFoundPage />} 
        />

        {/* Root Route */}
        <Route 
          path="/" 
          element={
            isActuallyAuthenticated ? (
              <RoleBasedRedirect />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Redirect root to easyHMS */}
        <Route 
          path="/" 
          element={<Navigate to="/" replace />} 
        />

        {/* Protected Routes - Require Authentication */}
        {isActuallyAuthenticated ? (
          <>
            {/* Admin Route */}
            <Route 
              path="/admin" 
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor']}>
                  <MainLayout>
                    <AdminDashboard />
                  </MainLayout>
                </RouteGuard>
              } 
            />

            {/* Clinical Dashboard Route - Restricted to Doctor and AdminDoctor roles */}
            <Route 
              path="/dashboard" 
              element={
                <RouteGuard requiredRoles={['Doctor', 'AdminDoctor']}>
                  <MainLayout>
                    <ClinicalDashboard />
                  </MainLayout>
                </RouteGuard>
              } 
            />

            {/* Redirect /docboard to /dashboard for consistency */}
            <Route 
              path="/docboard" 
              element={<Navigate to="/dashboard" replace />}
            />

            {/* Appointment Routes - Accessible to Admin, AdminDoctor, Receptionist, and Nurse roles */}
            <Route 
              path="/appointment-dashboard" 
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Receptionist', 'Nurse']}>
                  <MainLayout>
                    <AppointmentDashboard />
                  </MainLayout>
                </RouteGuard>
              } 
            />
            <Route 
              path="/appointment-booking" 
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Receptionist', 'Nurse']}>
                  <MainLayout>
                    <AppointmentBooking />
                  </MainLayout>
                </RouteGuard>
              } 
            />
            <Route 
              path="/appointment-oversight" 
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Receptionist', 'Nurse']}>
                  <MainLayout>
                    <AppointmentOversight />
                  </MainLayout>
                </RouteGuard>
              } 
            />

            {/* AI Routes - Restricted to Doctor and AdminDoctor roles */}
            <Route 
              path="/doc-ai" 
              element={
                <RouteGuard requiredRoles={['Doctor', 'AdminDoctor']}>
                  <MainLayout>
                    <DocAI />
                  </MainLayout>
                </RouteGuard>
              } 
            />

            {/* Profile Routes */}
            <Route 
              path="/profile" 
              element={
                <RouteGuard>
                  <MainLayout>
                    <ProfilePage onBack={() => window.history.back()} />
                  </MainLayout>
                </RouteGuard>
              } 
            />

            {/* Billing Routes */}
            <Route 
              path="/billing" 
              element={
                <RouteGuard>
                  <MainLayout>
                    <Billing />
                  </MainLayout>
                </RouteGuard>
              } 
            />

            {/* Prescription Canvas Editor Route - Restricted to Admin and AdminDoctor roles */}
            <Route 
              path="/admin/prescriptions/canvas" 
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor']}>
                  <MainLayout>
                    <CanvasPage />
                  </MainLayout>
                </RouteGuard>
              } 
            />
          </>
        ) : null}

        {/* Catch-all route - show 404 page */}
        <Route 
          path="*" 
          element={<NotFoundPage />} 
        />
      </Routes>
    </Suspense>
  );
};
