import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, SelectPlanRequest, SubmitPaymentRequest } from '../services/subscriptionApi';

export const useSubscriptionApi = () => {
  const queryClient = useQueryClient();

  // Get current status.
  // A CMS admin approving/rejecting a payment happens entirely outside this app (different app,
  // often a different device), so there's no mutation here to invalidate this query when it
  // changes. The global 5-minute staleTime + refetchOnWindowFocus:false (see App.tsx) would
  // otherwise leave an approved/rejected status invisible until a hard refresh — override both
  // here, and poll while a decision is actually pending so approval shows up on its own.
  const getStatus = (hospitalId: string) => {
    return useQuery({
      queryKey: ['subscriptionStatus', hospitalId],
      queryFn: () => subscriptionApi.getStatus(hospitalId),
      enabled: !!hospitalId,
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        return s === 'Pending' || s === 'PendingApproval' ? 15_000 : false;
      }
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

  // Get payment history. Same external-change problem as getStatus above — a submission's row
  // flips from PendingApproval to Approved/Rejected via CMS, not via anything in this app.
  const getPaymentHistory = (hospitalId: string) => {
    return useQuery({
      queryKey: ['subscriptionPaymentHistory', hospitalId],
      queryFn: () => subscriptionApi.getPaymentHistory(hospitalId),
      enabled: !!hospitalId,
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchInterval: (query) => {
        const hasPending = query.state.data?.some(p => p.status === 'PendingApproval');
        return hasPending ? 15_000 : false;
      }
    });
  };

  // Current doctor/bed usage vs. plan limits. MaxDoctors/MaxBeds change the moment a CMS admin
  // approves a plan — same external-change problem as getStatus above.
  const getUsage = (hospitalId: string) => {
    return useQuery({
      queryKey: ['subscriptionUsage', hospitalId],
      queryFn: () => subscriptionApi.getUsage(hospitalId),
      enabled: !!hospitalId,
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true
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

  // Select-plan + submit-payment as one atomic user action, used by the "pick a plan" drawer.
  // Deliberately NOT split across two separate button clicks (card click -> select, drawer submit
  // -> pay) the way selectPlan/submitPayment above allow: selecting a plan flips the subscription
  // row to Pending immediately, so if that fired the moment a plan card was clicked, merely
  // opening the drawer to preview an upgrade's price — then closing it without paying — would
  // leave an already-Active hospital stuck showing "Pending" for nothing. Bundling both calls
  // into one mutation means nothing is written until the user actually hits "Submit for Approval".
  const switchPlan = useMutation({
    mutationFn: async (data: SubmitPaymentRequest & { planId: string }) => {
      await subscriptionApi.selectPlan({ hospitalId: data.hospitalId, planId: data.planId });
      return subscriptionApi.submitPayment(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus', variables.hospitalId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionPaymentHistory', variables.hospitalId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionUsage', variables.hospitalId] });
    }
  });

  return {
    getStatus,
    getPlans,
    getPaymentHistory,
    getUsage,
    selectPlan,
    submitPayment,
    switchPlan
  };
};
