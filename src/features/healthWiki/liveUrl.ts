import { DOCTOR_DEKHO_URL } from '@/app/publicSite';

// Where a published article is read: Doctor Dekho, the patient site. The address is the one the rest of the app uses for Doctor Dekho
// (VITE_DOCTORDEKHO_URL, set per environment in the deploy workflow; the default is production).

/**
 * The public page of a published article. `from=1hms` makes Doctor Dekho show a "Back to EasyHMS" bar, so the doctor can return
 * in one tap (the browser Back button works too, because the page opens in the same tab).
 */
export const liveArticleUrl = (slug: string) => `${DOCTOR_DEKHO_URL}/health/conditions/${encodeURIComponent(slug)}?from=1hms`;
