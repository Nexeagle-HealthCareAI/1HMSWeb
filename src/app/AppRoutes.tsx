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


const SubscriptionPage = lazy(() => import('@/features/subscription/pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(module => ({ default: module.default })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminConfigModule = lazy(() => import('@/features/dashboard/components/AdminConfigModule').then(module => ({ default: module.AdminConfigModule })));
const IpdWorkflowApp = lazy(() => import('@/features/ipd-redesign/IpdWorkflowApp').then(module => ({ default: module.default })));
// DEV-ONLY: unauthenticated mobile-UI preview harnesses for IPD screens (see routes below).
const IpdDashboardPreview = lazy(() => import('@/features/ipd-redesign/pages/IpdDashboardPreview').then(module => ({ default: module.default })));
const BedBoardPreview = lazy(() => import('@/features/ipd-redesign/pages/BedBoardPreview').then(module => ({ default: module.default })));
const KpiDashboardPreview = lazy(() => import('@/features/ipd-redesign/pages/KpiDashboardPreview').then(module => ({ default: module.default })));
const AdmitPatientPreview = lazy(() => import('@/features/ipd-redesign/pages/AdmitPatientPreview').then(module => ({ default: module.default })));
const IpdMobileReview = lazy(() => import('@/features/ipd-redesign/pages/IpdMobileReview').then(module => ({ default: module.default })));
const ConsultantLedgerPreview = lazy(() => import('@/features/ipd-redesign/pages/ConsultantLedgerPreview').then(module => ({ default: module.default })));
const ReferredAdmissionsPreview = lazy(() => import('@/features/ipd-redesign/pages/ReferredAdmissionsPreview').then(module => ({ default: module.default })));
const IpdPatientWorkspacePage = lazy(() => import('@/features/ipd-redesign/pages/IpdPatientWorkspacePage').then(module => ({ default: module.default })));
const InventoryManagementPage = lazy(() => import('@/features/ipd-redesign/pages/InventoryManagementPage').then(module => ({ default: module.default })));
const OtBoardPage = lazy(() => import('@/features/ipd-redesign/pages/OtBoardPage').then(module => ({ default: module.default })));
const IcuBoardPage = lazy(() => import('@/features/ipd-redesign/pages/IcuBoardPage').then(module => ({ default: module.default })));
const ClinicalDashboard = lazy(() => import('@/features/doctor/components/DocBoard').then(module => ({ default: module.ClinicalDashboard })));
const AppointmentDashboard = lazy(() => import('@/features/appointment/components/AppointmentDashboard').then(module => ({ default: module.AppointmentDashboard })));
const AppointmentBooking = lazy(() => import('@/features/appointment/components/AppointmentBooking').then(module => ({ default: module.AppointmentBooking })));
const AppointmentOversight = lazy(() => import('@/features/appointment/components/AppointmentOversight').then(module => ({ default: module.AppointmentOversight })));

const DoctorCalendar = lazy(() => import('@/features/doctor-calendar/DoctorCalendarPage').then(module => ({ default: module.DoctorCalendarPage })));
const DocAI = lazy(() => import('@/features/ai/components/DocAI').then(module => ({ default: module.DocAI })));
const ProfilePage = lazy(() => import('@/features/profile/components/ProfilePage').then(module => ({ default: module.ProfilePage })));

const TokenDetailsPage = lazy(() => import('@/features/appointment/pages/TokenDetailsPage').then(module => ({ default: module.default })));
const NotFoundPage = lazy(() => import('@/components/shared/NotFoundPage').then(module => ({ default: module.default })));
const PrescriptionVerificationPage = lazy(() => import('@/features/patient/pages/PrescriptionVerificationPage').then(module => ({ default: module.default })));

// Patient routes
const PatientsPage = lazy(() => import('@/features/patient/components/PatientsPage').then(module => ({ default: module.PatientsPage })));
const ChainManagement = lazy(() => import('@/features/hospital/components/ChainManagement').then(module => ({ default: module.ChainManagement })));
const PatientProfilePage = lazy(() => import('@/features/patient/pages/PatientProfilePage').then(module => ({ default: module.PatientProfilePage })));
const BillingPage = lazy(() => import('@/features/billing/pages/BillingPage').then(module => ({ default: module.BillingPage })));
const BillingDashboard = lazy(() => import('@/features/billing/pages/BillingDashboard').then(module => ({ default: module.BillingDashboard })));
const PrintPreviewPage = lazy(() => import('@/features/billing/pages/PrintPreviewPage').then(module => ({ default: module.PrintPreviewPage })));
const EncounterBillingPage = lazy(() => import('@/features/billing/pages/EncounterBillingPage').then(module => ({ default: module.default })));


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
        {/* Token View - Publicly accessible */}
        <Route
          path="/token-view"
          element={<TokenDetailsPage />}
        />

        {/* DEV-ONLY: unauthenticated IPD dashboard preview for mobile-UI iteration. */}
        {import.meta.env.DEV && (
          <Route
            path="/ipd-preview"
            element={
              <MainLayout>
                <IpdDashboardPreview />
              </MainLayout>
            }
          />
        )}

        {/* DEV-ONLY: unauthenticated Bed Board preview for mobile-UI iteration. */}
        {import.meta.env.DEV && (
          <Route
            path="/bedboard-preview"
            element={
              <MainLayout>
                <BedBoardPreview />
              </MainLayout>
            }
          />
        )}

        {/* DEV-ONLY: unauthenticated KPI Dashboard preview for mobile-UI iteration. */}
        {import.meta.env.DEV && (
          <Route
            path="/kpi-preview"
            element={
              <MainLayout>
                <KpiDashboardPreview />
              </MainLayout>
            }
          />
        )}

        {/* DEV-ONLY: unauthenticated Admit Patient sheet preview for mobile-UI iteration. */}
        {import.meta.env.DEV && (
          <Route path="/admit-preview" element={<AdmitPatientPreview />} />
        )}

        {/* DEV-ONLY: Consultant Ledger + Referred Admissions previews for mobile-UI iteration. */}
        {import.meta.env.DEV && (
          <Route
            path="/ledger-preview"
            element={
              <MainLayout>
                <ConsultantLedgerPreview />
              </MainLayout>
            }
          />
        )}
        {import.meta.env.DEV && (
          <Route
            path="/referrals-preview"
            element={
              <MainLayout>
                <ReferredAdmissionsPreview />
              </MainLayout>
            }
          />
        )}

        {/* DEV-ONLY: one-page mobile review gallery embedding every IPD preview in a phone frame. */}
        {import.meta.env.DEV && (
          <Route path="/ipd-mobile-review" element={<IpdMobileReview />} />
        )}

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

        {/* Print Preview Route - Public or Protected? usually protected but lets keep open for iframe/window access simplicity or protect appropriately */}
        <Route
          path="/print-preview"
          element={
            <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Receptionist', 'Nurse', 'Accountant']}>
              <PrintPreviewPage />
            </RouteGuard>
          }
        />

        {/* Verification Route - Public */}
        <Route
          path="/verify/:appointmentId"
          element={<PrescriptionVerificationPage />}
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
            <Route
              path="/configuration"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor']}>
                  <MainLayout>
                    <AdminConfigModule />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/subscription"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor']}>
                  <MainLayout>
                    <SubscriptionPage />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/chain"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor']}>
                  <MainLayout>
                    <ChainManagement />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/ipd-workspace"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor', 'Nurse']}>
                  <MainLayout>
                    <IpdWorkflowApp />
                  </MainLayout>
                </RouteGuard>
              }
            />

            <Route
              path="/ipd-workspace/patient/:id"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor', 'Nurse']}>
                  <MainLayout>
                    <IpdPatientWorkspacePage />
                  </MainLayout>
                </RouteGuard>
              }
            />

            <Route
              path="/inventory"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor', 'Nurse']}>
                  <MainLayout>
                    <InventoryManagementPage />
                  </MainLayout>
                </RouteGuard>
              }
            />
            
            <Route
              path="/ot-board"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor', 'Nurse']}>
                  <MainLayout>
                    <OtBoardPage />
                  </MainLayout>
                </RouteGuard>
              }
            />

            <Route
              path="/icu-board"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor', 'Nurse']}>
                  <MainLayout>
                    <IcuBoardPage />
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

            {/* Doctor Calendar Route - Restricted to Doctor and AdminDoctor roles */}
            <Route
              path="/calendar"
              element={
                <RouteGuard requiredRoles={['Doctor', 'AdminDoctor']}>
                  <MainLayout>
                    <DoctorCalendar />
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


            {/* Patient Routes - Restricted to Admin and AdminDoctor roles */}
            <Route
              path="/patients"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor']}>
                  <MainLayout>
                    <PatientsPage />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/patient/:patientId"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor']}>
                  <MainLayout>
                    <PatientProfilePage />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/patient/new"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor']}>
                  <MainLayout>
                    <PatientProfilePage />
                  </MainLayout>
                </RouteGuard>
              }
            />

            {/* Billing Route - Restricted to Admin and AdminDoctor roles */}
            {/* Billing Route - Restricted to Admin and AdminDoctor roles */}
            <Route
              path="/billing"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Accountant']}>
                  <MainLayout>
                    <BillingDashboard />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/billing/ledger"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Accountant']}>
                  <MainLayout>
                    <BillingPage />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/billing/:appointmentId"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Accountant']}>
                  <MainLayout>
                    <BillingPage />
                  </MainLayout>
                </RouteGuard>
              }
            />
            <Route
              path="/billing/encounter/:encounterId"
              element={
                <RouteGuard requiredRoles={['Admin', 'AdminDoctor', 'Doctor', 'Receptionist', 'Nurse', 'Accountant']}>
                  <MainLayout>
                    <EncounterBillingPage />
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
    </Suspense >
  );
};
