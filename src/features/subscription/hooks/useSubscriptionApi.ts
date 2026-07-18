import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, SelectPlanRequest, SubmitPaymentRequest } from '../services/subscriptionApi';

export const useSubscriptionApi = () => {
  const queryClient = useQueryClient();

  // Get current status
  const getStatus = (hospitalId: string) => {
    return useQuery({
      queryKey: ['subscriptionStatus', hospitalId],
      queryFn: () => subscriptionApi.getStatus(hospitalId),
      enabled: !!hospitalId,
      retry: false
    });
  };

  // Get available plans
  const getPlans = () => {
    return useQuery({
      queryKey: ['subscriptionPlans'],
      queryFn: () => subscriptionApi.getPlans(),
      retry: false
    });
  };

  // Get payment history
  const getPaymentHistory = (hospitalId: string) => {
    return useQuery({
      queryKey: ['subscriptionPaymentHistory', hospitalId],
      queryFn: () => subscriptionApi.getPaymentHistory(hospitalId),
      enabled: !!hospitalId,
      retry: false
    });
  };

  // Select a plan
  const selectPlan = useMutation({
    mutationFn: (data: SelectPlanRequest) => subscriptionApi.selectPlan(data),
    onSuccess: (_, variables) => {
      // Invalidate the status query to refetch after a successful selection
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus', variables.hospitalId] });
    }
  });

  // Submit payment
  const submitPayment = useMutation({
    mutationFn: (data: SubmitPaymentRequest) => subscriptionApi.submitPayment(data),
    onSuccess: (_, variables) => {
      // Invalidate the status + history queries to refetch after successful payment submission
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus', variables.hospitalId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionPaymentHistory', variables.hospitalId] });
    }
  });

  return {
    getStatus,
    getPlans,
    getPaymentHistory,
    selectPlan,
    submitPayment
  };
};
