import type { ArticleDetail, InboxArticle, InboxResponse, ReviewDecision, ReviewResult } from '../types';
import { MIN_CHANGE_COMMENT } from '../types';

// Example data for local design review (VITE_HEALTH_WIKI_MOCK=true, or the dev-only preview route).
// Replace-with-API: the real calls are in healthWikiApi.ts.

const gradient = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/></svg>`)}`;

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const REVIEWER = { name: 'Dr. Meera Nair', qualification: 'MBBS, MD, DM (Endocrinology)', speciality: 'Endocrinologist', registrationNumber: '48213', registrationCouncil: 'Delhi Medical Council' };

type Stored = ArticleDetail;

const seed = (): Stored[] => [
  {
    slug: 'high-blood-pressure', type: 'MEDICAL', title: 'Living with High Blood Pressure', description: 'What the numbers mean, and daily habits that help keep them in range.',
    coverImageUrl: gradient('#6366F1', '#0EA5E9'), coverImageAlt: 'Abstract blue gradient', authorName: 'NexEagle content team', waitingDays: 4, views: null, likes: null,
    publishedAt: null, updatedAt: iso(4), relatedConditionSlug: 'hypertension', disclosure: null, references: 'World Health Organization. Hypertension fact sheet.\nICMR. Guidelines for management of hypertension.',
    content: '## Know your numbers\n\nA normal reading is below **120/80**. Readings above **140/90** on two visits usually need treatment.\n\n## Daily habits that help\n\n- Cut salt to under 5 g a day\n- Walk 30 minutes, five days a week\n- Check your pressure at home, at the same time each day\n\n> Do not stop a prescribed medicine without asking your doctor.',
    reviewer: REVIEWER, status: 'IN_REVIEW', canDecide: true, dailyViews: [],
  },
  {
    slug: 'thyroid-basics', type: 'MEDICAL', title: 'Thyroid Basics: Hypo and Hyperthyroidism', description: 'Symptoms, tests and treatment of an under- or overactive thyroid, in plain language.',
    coverImageUrl: gradient('#F59E0B', '#EF4444'), coverImageAlt: 'Abstract warm gradient', authorName: 'NexEagle content team', waitingDays: 1, views: null, likes: null,
    publishedAt: null, updatedAt: iso(1), relatedConditionSlug: 'thyroid', disclosure: null, references: null,
    content: '## What the thyroid does\n\nA small gland in your neck that controls how fast your body uses energy.\n\n## Common signs\n\n- Tiredness and weight gain (low thyroid)\n- Racing heart and weight loss (high thyroid)\n\n## Tests\n\nA **TSH** blood test is the first step.',
    reviewer: REVIEWER, status: 'IN_REVIEW', canDecide: true, dailyViews: [],
  },
  {
    slug: 'diabetes-type-2', type: 'MEDICAL', title: 'Understanding Type 2 Diabetes', description: 'A plain-language guide to symptoms, causes and management.',
    coverImageUrl: gradient('#4F46E5', '#0E9F6E'), coverImageAlt: 'Abstract indigo and green gradient', authorName: 'NexEagle content team', waitingDays: null, views: 842, likes: 61,
    publishedAt: iso(9), updatedAt: iso(9), relatedConditionSlug: 'diabetes', disclosure: null, references: null,
    content: '## What is Type 2 Diabetes?\n\nYour body cannot use insulin well, so sugar builds up in your blood.\n\n## Common symptoms\n\n- Increased thirst\n- Frequent urination\n- **Slow-healing** wounds',
    reviewer: REVIEWER, status: 'PUBLISHED', canDecide: false, dailyViews: [22, 31, 28, 40, 35, 52, 61, 48, 57, 66, 71, 64, 80, 94],
  },
  {
    slug: 'insulin-storage', type: 'MEDICAL', title: 'How to Store and Inject Insulin', description: 'Keep insulin effective: storage, travel and injection-site tips.',
    coverImageUrl: gradient('#14B8A6', '#6366F1'), coverImageAlt: 'Abstract teal and violet gradient', authorName: 'Arjun Mehta', waitingDays: null, views: 319, likes: 27,
    publishedAt: iso(20), updatedAt: iso(20), relatedConditionSlug: 'diabetes', disclosure: null, references: null,
    content: '## Storage\n\nKeep unopened insulin in the fridge. In-use pens stay at room temperature for up to 28 days.',
    reviewer: REVIEWER, status: 'PUBLISHED', canDecide: false, dailyViews: [10, 14, 9, 18, 22, 15, 19, 24, 21, 30, 26, 28, 33, 29],
  },
  {
    slug: 'pcos-guide', type: 'MEDICAL', title: 'PCOS: Signs, Tests and Treatment', description: 'What polycystic ovary syndrome is and how it is managed.',
    coverImageUrl: null, coverImageAlt: null, authorName: 'NexEagle content team', waitingDays: null, views: 87, likes: 8,
    publishedAt: iso(29), updatedAt: iso(29), relatedConditionSlug: 'pcos', disclosure: null, references: null,
    content: '## Overview\n\nA common hormonal condition in women of reproductive age.',
    reviewer: REVIEWER, status: 'PUBLISHED', canDecide: false, dailyViews: [2, 4, 3, 6, 5, 7, 4, 8, 6, 9, 5, 7, 8, 10],
  },
];

let articles = seed();
export const resetMockHealthWiki = () => { articles = seed(); };

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 200));
const brief = ({ content: _c, coverImageAlt: _a, relatedConditionSlug: _r, disclosure: _d, references: _f, reviewer: _v, status: _s, canDecide: _k, dailyViews: _y, ...rest }: Stored): InboxArticle => rest;

export class MockHealthWikiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const mockHealthWikiApi = {
  inbox: (): Promise<InboxResponse> =>
    wait({
      pending: articles.filter((a) => a.status === 'IN_REVIEW').sort((a, b) => (b.waitingDays ?? 0) - (a.waitingDays ?? 0)).map(brief),
      published: articles.filter((a) => a.status === 'PUBLISHED').sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).map(brief),
    }),
  article: async (slug: string): Promise<ArticleDetail> => {
    const a = articles.find((x) => x.slug === slug);
    if (!a) throw new MockHealthWikiError(404, 'Article not found.');
    return wait({ ...a });
  },
  review: async (slug: string, d: ReviewDecision): Promise<ReviewResult> => {
    const a = articles.find((x) => x.slug === slug);
    if (!a) throw new MockHealthWikiError(404, 'Article not found.');
    if (a.status !== 'IN_REVIEW' || !a.canDecide) throw new MockHealthWikiError(409, 'This article is not waiting for your review.');
    if (d.decision === 'REQUEST_CHANGES') {
      if (d.comment.trim().length < MIN_CHANGE_COMMENT) throw new MockHealthWikiError(400, 'Add a short comment so the writer knows what to change.');
      articles = articles.filter((x) => x !== a);
      return wait({ outcome: 'SENT_BACK' as const });
    }
    Object.assign(a, { status: 'PUBLISHED', canDecide: false, waitingDays: null, views: 0, likes: 0, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dailyViews: Array(14).fill(0) });
    return wait({ outcome: 'PUBLISHED' as const });
  },
};
