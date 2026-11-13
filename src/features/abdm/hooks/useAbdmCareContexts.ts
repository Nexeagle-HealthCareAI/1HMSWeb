import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RoleService } from '@/features/auth/services/roleService';
import { abdmApi, type AbdmCareContext, type AbdmCareContextSource } from '../services/abdmApi';

export const abdmCareContextsKey = (hospitalId: string) => ['abdm', 'care-contexts', hospitalId] as const;

const inFlight = (c: AbdmCareContext) => c.linkStatus === 'TOKEN_REQUESTED' || c.linkStatus === 'LINK_REQUESTED';

/** The ABDM endpoints need the `abdm` permission; without it nothing ABDM-related is shown. */
export const canUseAbdm = () => RoleService.hasPermission('abdm');

/**
 * One shared list per hospital, so a board with many rows makes one request, not one per row.
 * Polls every 5 s only while a link is waiting on ABDM, then stops.
 */
export const useAbdmCareContexts = (hospitalId: string) =>
  useQuery({
    queryKey: abdmCareContextsKey(hospitalId),
    queryFn: async () => (await abdmApi.getCareContexts(hospitalId)).careContexts ?? [],
    enabled: !!hospitalId && canUseAbdm(),
    staleTime: 15_000,
    refetchInterval: query => (query.state.data?.some(inFlight) ? 5_000 : false),
  });

export const useAbdmCareContextFor = (hospitalId: string, sourceId: string) => {
  const query = useAbdmCareContexts(hospitalId);
  return { ...query, careContext: query.data?.find(c => c.sourceId === sourceId) };
};

export const useLinkAbdmCareContext = (hospitalId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceType, sourceId }: { sourceType: AbdmCareContextSource; sourceId: string }) =>
      abdmApi.linkCareContext(hospitalId, sourceType, sourceId),
    onSuccess: res => {
      if (res.careContext) {
        queryClient.setQueryData<AbdmCareContext[]>(abdmCareContextsKey(hospitalId), old => {
          const rest = (old ?? []).filter(c => c.careContextId !== res.careContext!.careContextId);
          return [res.careContext!, ...rest];
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['abdm'] });
    },
  });
};
