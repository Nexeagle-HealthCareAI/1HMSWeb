import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/MainLayout";
import { DocBoard } from "./components/DocBoard";
import { DoctorCalendar } from "./components/DoctorCalendar";
import { EPrescription } from "./components/EPrescription";
import { AdminDashboard } from "./components/AdminDashboard";
import { AppointmentDashboard } from "./components/AppointmentDashboard";
import { AppointmentBooking } from "./components/AppointmentBooking";
import { ProfilePage } from "./components/ProfilePage";
import { Billing } from "./components/Billing";
import { DocAI } from "./components/DocAI";
import { InternalChat } from "./components/InternalChat";
import { BulkMessaging } from "./components/BulkMessaging";
import { PatientsPage } from "./components/PatientsPage";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            
            {/* Protected routes with MainLayout */}
            <Route path="/dashboard" element={
              <MainLayout>
                <DocBoard />
              </MainLayout>
            } />
            <Route path="/admin" element={
              <MainLayout>
                <AdminDashboard />
              </MainLayout>
            } />
            <Route path="/calendar" element={
              <MainLayout>
                <DoctorCalendar />
              </MainLayout>
            } />
            <Route path="/appointment-dashboard" element={
              <MainLayout>
                <AppointmentDashboard />
              </MainLayout>
            } />
            <Route path="/appointment-scheduler" element={
              <MainLayout>
                <AppointmentDashboard />
              </MainLayout>
            } />
            <Route path="/book-appointment" element={
              <MainLayout>
                <AppointmentBooking />
              </MainLayout>
            } />
            <Route path="/billing" element={
              <MainLayout>
                <Billing />
              </MainLayout>
            } />
            <Route path="/doc-ai" element={
              <MainLayout>
                <DocAI />
              </MainLayout>
            } />
            <Route path="/chat" element={
              <MainLayout>
                <InternalChat />
              </MainLayout>
            } />
            <Route path="/bulk-messaging" element={
              <MainLayout>
                <BulkMessaging />
              </MainLayout>
            } />
            <Route path="/patients" element={
              <MainLayout>
                <PatientsPage />
              </MainLayout>
            } />
            <Route path="/profile" element={
              <MainLayout>
                <ProfilePage onBack={() => window.history.back()} />
              </MainLayout>
            } />
            <Route path="/prescription/:patientId" element={
              <MainLayout>
                <EPrescription />
              </MainLayout>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
