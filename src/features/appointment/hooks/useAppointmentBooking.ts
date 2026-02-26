import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { appointmentApi, RegisterAppointmentRequest, RegisterAppointmentResponse } from '../services/appointmentApi';

interface UseAppointmentBookingReturn {
  bookAppointment: (request: RegisterAppointmentRequest, hospitalId: string) => Promise<RegisterAppointmentResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useAppointmentBooking = (): UseAppointmentBookingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const bookAppointment = async (request: RegisterAppointmentRequest, hospitalId: string): Promise<RegisterAppointmentResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await appointmentApi.registerAppointment(hospitalId, request);

      // Force dashboards to refetch their lists since a new appointment has been created
      queryClient.invalidateQueries({ queryKey: ['appointmentDetails'] });
      queryClient.invalidateQueries({ queryKey: ['doctorAppointmentDetails'] });
      queryClient.invalidateQueries({ queryKey: ['patientAppointmentDetails'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointmentDetails'] });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to book appointment';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    bookAppointment,
    isLoading,
    error,
    clearError
  };
};
