import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
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
          <Route path="/calendar" element={<DoctorCalendar />} />
          <Route path="/prescription/:patientId" element={<EPrescription />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/appointment-dashboard" element={<AppointmentDashboard />} />
          <Route path="/appointment-scheduler" element={<AppointmentDashboard />} />
          <Route path="/book-appointment" element={<AppointmentBooking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
