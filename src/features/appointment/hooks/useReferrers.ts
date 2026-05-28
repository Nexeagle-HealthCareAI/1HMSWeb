import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referrerApi, CreateReferrerRequest } from '../services/referrerApi';

export const useReferrers = (hospitalId: string, search?: string) => {
  return useQuery({
    queryKey: ['referrers', hospitalId, search ?? ''],
    queryFn: () => referrerApi.getReferrers(hospitalId, search),
    enabled: !!hospitalId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateReferrer = (hospitalId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateReferrerRequest) => referrerApi.createReferrer(hospitalId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrers', hospitalId] });
    },
  });
};
