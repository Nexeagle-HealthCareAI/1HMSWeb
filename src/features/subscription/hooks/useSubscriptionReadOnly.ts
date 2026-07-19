import { useAuthStore } from '@/store';
import { useSubscriptionApi } from './useSubscriptionApi';
import { useSubscriptionUpsellStore } from '@/store/subscriptionUpsellStore';

/**
 * True once the hospital's subscription is Expired/Blocked — the shared gate for every write
 * action across the app (see HospitalAccessFilter.cs on the backend, which enforces the same
 * rule server-side: GETs pass through regardless of status, everything else is rejected). This
 * hook is the frontend half — components thread `isReadOnly` into their existing `disabled={...}`
 * expressions and guard clauses so the UI reflects the block before a request is ever sent.
 *
 * `blockAction(featureLabel?)` is the standard way to surface that block to the user: it opens
 * the shared SubscriptionUpsellModal (mounted once in MainLayout.tsx) instead of a toast, so every
 * gated action across the app shows the same "renew to unlock" popup rather than each page
 * reinventing its own message. Typical call site:
 *   if (isReadOnly) { blockAction('Cancelling appointments'); return; }
 */
export const useSubscriptionReadOnly = () => {
  const hospitalId = useAuthStore(state => state.hospitalId) || '';
  const roles = useAuthStore(state => state.userRoles) || [];
  const isAdminRole = roles.includes('Admin') || roles.includes('AdminDoctor');
  const { getStatus } = useSubscriptionApi();
  const { data: subscriptionStatus } = getStatus(hospitalId);
  const isReadOnly = subscriptionStatus?.status === 'Expired' || subscriptionStatus?.status === 'Blocked';
  const openUpsell = useSubscriptionUpsellStore(state => state.open);

  return { isReadOnly, isAdminRole, status: subscriptionStatus?.status, blockAction: openUpsell };
};

export default useSubscriptionReadOnly;
