import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/Layout/MainLayout";
import { DoctorCalendar } from "./components/DoctorCalendar";
import { EPrescription } from "./components/EPrescription";
import { AdminDashboard } from "./components/AdminDashboard";
import { AppointmentDashboard } from "./components/AppointmentDashboard";
import { AppointmentBooking } from "./components/AppointmentBooking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/appointment-scheduler" element={
            <MainLayout>
              <AppointmentDashboard />
            </MainLayout>
          } />
          <Route path="/appointment-scheduler/book" element={
            <MainLayout>
              <AppointmentBooking />
            </MainLayout>
          } />
          <Route path="/calendar" element={
            <MainLayout>
              <DoctorCalendar />
            </MainLayout>
          } />
          <Route path="/prescription/:patientId?" element={
            <MainLayout>
              <EPrescription />
            </MainLayout>
          } />
          <Route path="/admin" element={
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
