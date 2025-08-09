import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useAuthLoading } from '@/store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MainLayout } from '@/components/layout/MainLayout';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(module => ({ default: module.default })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const DocBoard = lazy(() => import('@/features/doctor/components/DocBoard').then(module => ({ default: module.DocBoard })));
const AppointmentDashboard = lazy(() => import('@/features/appointment/components/AppointmentDashboard').then(module => ({ default: module.AppointmentDashboard })));
const AppointmentBooking = lazy(() => import('@/features/appointment/components/AppointmentBooking').then(module => ({ default: module.AppointmentBooking })));
const AppointmentOversight = lazy(() => import('@/features/appointment/components/AppointmentOversight').then(module => ({ default: module.AppointmentOversight })));
const DocAI = lazy(() => import('@/features/ai/components/DocAI').then(module => ({ default: module.DocAI })));
const ProfilePage = lazy(() => import('@/features/patient/components/ProfilePage').then(module => ({ default: module.ProfilePage })));
const Billing = lazy(() => import('@/features/billing/components/Billing').then(module => ({ default: module.Billing })));
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

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteLoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          } 
        />

        {/* 404 Route */}
        <Route 
          path="/404" 
          element={<NotFoundPage />} 
        />

        {/* Admin Route - Accessible without authentication for development */}
        <Route 
          path="/admin" 
          element={
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          } 
        />

        {/* Protected Routes */}
        {isAuthenticated ? (
          <>

            {/* Dashboard Routes */}
            <Route 
              path="/dashboard" 
              element={
                <MainLayout>
                  <DocBoard />
                </MainLayout>
              } 
            />

            {/* DocBoard Route */}
            <Route 
              path="/docboard" 
              element={
                <MainLayout>
                  <DocBoard />
                </MainLayout>
              } 
            />

            {/* Appointment Routes */}
            <Route 
              path="/appointment-dashboard" 
              element={
                <MainLayout>
                  <AppointmentDashboard />
                </MainLayout>
              } 
            />
            <Route 
              path="/appointment-booking" 
              element={
                <MainLayout>
                  <AppointmentBooking />
                </MainLayout>
              } 
            />
            <Route 
              path="/appointment-oversight" 
              element={
                <MainLayout>
                  <AppointmentOversight />
                </MainLayout>
              } 
            />

            {/* AI Routes */}
            <Route 
              path="/doc-ai" 
              element={
                <MainLayout>
                  <DocAI />
                </MainLayout>
              } 
            />

            {/* Profile Routes */}
            <Route 
              path="/profile" 
              element={
                <MainLayout>
                  <ProfilePage onBack={() => window.history.back()} />
                </MainLayout>
              } 
            />

            {/* Billing Routes */}
            <Route 
              path="/billing" 
              element={
                <MainLayout>
                  <Billing />
                </MainLayout>
              } 
            />

            {/* Catch-all route - show 404 page */}
            <Route 
              path="*" 
              element={<NotFoundPage />} 
            />
          </>
        ) : (
          // Show 404 page for unauthenticated users too
          <Route path="*" element={<NotFoundPage />} />
        )}
      </Routes>
    </Suspense>
  );
};
