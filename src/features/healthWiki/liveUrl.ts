// Where a published article is read: Doctor Dekho, the patient site. Set VITE_DOCTOR_DEKHO_URL per environment (see .env.development and
// .env.production); without it the production site is used.
const BASE = ((import.meta.env.VITE_DOCTOR_DEKHO_URL as string | undefined) || 'https://doctordekho.nexeagle.com').replace(/\/+$/, '');

/**
 * The public page of a published article. `from=1hms` makes Doctor Dekho show a "Back to EasyHMS" bar, so the doctor can return
 * in one tap (the browser Back button works too, because the page opens in the same tab).
 */
export const liveArticleUrl = (slug: string) => `${BASE}/health/conditions/${encodeURIComponent(slug)}?from=1hms`;
