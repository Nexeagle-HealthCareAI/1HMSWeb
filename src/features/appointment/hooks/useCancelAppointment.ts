import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi, CancelAppointmentRequest, ApiResponse } from '../services/appointmentApi';
import { AppointmentDetailsResponse } from '../services/appointmentApi';

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error, CancelAppointmentRequest, { previousData?: [readonly unknown[], unknown][] }>({
    mutationFn: (request) => appointmentApi.cancelAppointment(request),
    networkMode: 'offlineFirst',
    
    // Optimistic Update
    onMutate: async (request) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['appointmentDetails'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['appointmentDetails'] });

      // Optimistically update to the new value by removing the cancelled appointment
      queryClient.setQueriesData<AppointmentDetailsResponse>(
        { queryKey: ['appointmentDetails'] },
        (old) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: old.data.filter((app: any) => app.appointmentId !== request.appointmentId)
          };
        }
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Always refetch after error or success to ensure sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentDetails'] });
    },
  });
};
