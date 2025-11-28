import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { useToast } from '@/hooks/use-toast';

export const useAppointmentCancel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelAppointmentMutation = useMutation({
    mutationFn: ({ appointmentId, patientId }: { appointmentId: string; patientId?: string }) =>
      appointmentApi.cancelAppointment({
        appointmentId,
        patientId: patientId ?? '',
      }),
    onSuccess: (data) => {
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      });
      
      // Invalidate relevant queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointmentDetails'] });
    },
    onError: (error: any) => {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelAppointment = async (appointmentId: string, patientId?: string) => {
    try {
      await cancelAppointmentMutation.mutateAsync({ appointmentId, patientId });
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    cancelAppointment,
    isPending: cancelAppointmentMutation.isPending,
  };
};
