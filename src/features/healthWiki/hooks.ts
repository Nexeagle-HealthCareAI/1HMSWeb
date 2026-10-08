import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { healthWikiApi } from './api/healthWikiApi';
import type { ReviewDecision } from './types';

export const healthWikiKeys = {
  inbox: ['health-wiki', 'inbox'] as const,
  article: (slug: string) => ['health-wiki', 'article', slug] as const,
};

export const useInbox = () => useQuery({ queryKey: healthWikiKeys.inbox, queryFn: () => healthWikiApi.inbox(), staleTime: 30_000 });

export const useArticle = (slug: string) =>
  useQuery({ queryKey: healthWikiKeys.article(slug), queryFn: () => healthWikiApi.article(slug), enabled: !!slug });

export function useReview(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: ReviewDecision) => healthWikiApi.review(slug, d),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: healthWikiKeys.inbox });
      void qc.invalidateQueries({ queryKey: healthWikiKeys.article(slug) });
    },
  });
}

/** Number of articles waiting for this doctor, for the sidebar. Does not retry or refetch on focus: it is a hint. */
export const usePendingCount = (enabled: boolean) =>
  useQuery({
    queryKey: [...healthWikiKeys.inbox, 'count'],
    queryFn: async () => (await healthWikiApi.inbox()).pending.length,
    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
