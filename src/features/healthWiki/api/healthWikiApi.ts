import { apiClient } from '@/services';
import type { ArticleDetail, InboxResponse, ReviewDecision, ReviewResult } from '../types';
import { mockHealthWikiApi } from './mockHealthWikiApi';

// The /health-wiki endpoints are not built yet (see the Health Wiki developer note, H1 to H4). Until
// they are, VITE_HEALTH_WIKI_MOCK=true, or the dev-only preview route, answers from example data.

let forcedMock = false;
/** Used by the dev-only preview route. */
export const forceHealthWikiMock = () => { forcedMock = true; };

const mocked = () => forcedMock || import.meta.env.VITE_HEALTH_WIKI_MOCK === 'true';
const enc = encodeURIComponent;

export const healthWikiApi = {
  inbox: (): Promise<InboxResponse> => (mocked() ? mockHealthWikiApi.inbox() : apiClient.get('/health-wiki/inbox')),
  article: (slug: string): Promise<ArticleDetail> => (mocked() ? mockHealthWikiApi.article(slug) : apiClient.get(`/health-wiki/articles/${enc(slug)}`)),
  review: (slug: string, d: ReviewDecision): Promise<ReviewResult> =>
    mocked() ? mockHealthWikiApi.review(slug, d) : apiClient.post(`/health-wiki/articles/${enc(slug)}/review`, d),
};

/** Message for a failed call: the API's own message when it sends one. */
export const healthWikiErrorMessage = (e: unknown, fallback = 'Something went wrong. Try again.'): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || err.message || fallback;
};
