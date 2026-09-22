// Origin of Doctor Dekho -- the patient-facing public directory that hospitals list their doctors
// on. It is a separate app from this one (its own repo + deployment), so anything that builds a
// link a patient will open -- printed QR posters, "Preview" buttons -- must go through here rather
// than hardcode a hostname.
//
// It used to be served from https://nexeagle.com; the old /doctors/... paths still redirect to it,
// so QR posters printed before the split keep working.
//
// Baked in at build time, like VITE_API_BASE_URL. The default is PROD; the Dev build overrides it
// (see Dockerfile + deploy-web.yml) so dev-printed posters point at dev's Doctor Dekho, which is
// the one that actually serves the dev hospital's doctors.
export const DOCTOR_DEKHO_URL = (
    import.meta.env.VITE_DOCTORDEKHO_URL || 'https://doctordekho.nexeagle.com'
).replace(/\/+$/, '');
