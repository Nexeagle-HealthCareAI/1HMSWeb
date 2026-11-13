/** Vita API base URL. Empty = the Vita dock is not shown (feature off). */
export const VITA_API_URL: string = (import.meta.env.VITE_VITA_API_URL as string | undefined)?.trim() ?? '';
