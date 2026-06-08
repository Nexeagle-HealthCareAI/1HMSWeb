import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { appointmentApi, RegisterAppointmentRequest, RegisterAppointmentResponse } from '../services/appointmentApi';
import { offlineMutation } from '@/offline';

interface BookResult extends RegisterAppointmentResponse {
  queuedOffline?: boolean;
}

interface UseAppointmentBookingReturn {
  bookAppointment: (request: RegisterAppointmentRequest, hospitalId: string) => Promise<BookResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useAppointmentBooking = (): UseAppointmentBookingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const bookAppointment = async (request: RegisterAppointmentRequest, hospitalId: string): Promise<BookResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Offline-aware: when unreachable, the booking is queued to the outbox and replayed on
      // reconnect; the same /appointments/register endpoint is used for the live call and the replay.
      const { queued, data } = await offlineMutation<RegisterAppointmentResponse>({
        entity: 'appointment',
        opType: 'create',
        client: 'api',
        method: 'post',
        url: `/appointments/register/${hospitalId}?allocateToken=true`,
        data: request,
        label: `Appointment · ${request.patient?.fullName ?? ''}`.trim(),
        hospitalId,
        run: () => appointmentApi.registerAppointment(hospitalId, request),
        synthetic: (clientKey) => ({ appointmentId: clientKey, patientId: request.patient?.patientId || '', tokenNumber: '' }),
      });

      if (!queued) {
        // Force dashboards to refetch their lists since a new appointment has been created
        queryClient.invalidateQueries({ queryKey: ['appointmentDetails'] });
        queryClient.invalidateQueries({ queryKey: ['doctorAppointmentDetails'] });
        queryClient.invalidateQueries({ queryKey: ['patientAppointmentDetails'] });
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointmentDetails'] });
      }

      return { ...data, queuedOffline: queued };
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
