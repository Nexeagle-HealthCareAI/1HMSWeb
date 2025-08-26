import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { useToast } from '@/hooks/use-toast';

export const useAppointmentCancel = () => {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelAppointmentMutation = useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) =>
      appointmentApi.cancel(appointmentId, reason),
    onSuccess: (data) => {
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      });
      
      // Invalidate relevant queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (error: any) => {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsPending(false);
    },
  });

  const cancelAppointment = async (appointmentId: string, reason?: string) => {
    setIsPending(true);
    try {
      await cancelAppointmentMutation.mutateAsync({ appointmentId, reason });
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    cancelAppointment,
    isPending: isPending || cancelAppointmentMutation.isPending,
  };
};
