import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { healthWikiApi } from './api/healthWikiApi';
import type { ReviewDecision, TopicInput } from './types';

export const healthWikiKeys = {
  inbox: ['health-wiki', 'inbox'] as const,
  article: (slug: string) => ['health-wiki', 'article', slug] as const,
  topics: ['health-wiki', 'topics'] as const,
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

export const useTopics = () => useQuery({ queryKey: healthWikiKeys.topics, queryFn: () => healthWikiApi.topics(), staleTime: 30_000 });

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicInput) => healthWikiApi.createTopic(input),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: healthWikiKeys.topics }); },
  });
}

export function useAddTopicDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; outline?: string; whyItMatters?: string }) => healthWikiApi.addTopicDetail(v.id, { outline: v.outline, whyItMatters: v.whyItMatters }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: healthWikiKeys.topics }); },
  });
}

/** Opens Doctor Dekho with the doctor already signed in. */
export const useWriteHandoff = () => useMutation({ mutationFn: (to: 'write' | 'drafts' = 'write') => healthWikiApi.writeHandoff(to) });
