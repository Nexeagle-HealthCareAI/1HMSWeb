import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi, PatientVitalsRequest, PatientVitalsResponse } from '../services/appointmentApi';

export const useSaveVitals = () => {
  const queryClient = useQueryClient();

  return useMutation<PatientVitalsResponse, Error, PatientVitalsRequest>({
    mutationFn: (vitalsData: PatientVitalsRequest) => appointmentApi.savePatientVitals(vitalsData),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['appointments', variables.appointmentId]
      });
      
      // Invalidate appointment details queries to refresh dashboard data
      queryClient.invalidateQueries({
        queryKey: ['appointmentDetails']
      });
    },
  });
};
