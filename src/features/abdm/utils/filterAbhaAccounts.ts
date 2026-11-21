import type { AbhaAccountSummary } from '../services/abdmApi';

// Case-insensitive match on the things staff search an ABHA account by.
export const filterAbhaAccounts = (accounts: AbhaAccountSummary[], query: string): AbhaAccountSummary[] => {
  const q = query.trim().toLowerCase();
  if (!q) return accounts;
  const digits = q.replace(/\D/g, '');
  return accounts.filter(a =>
    (a.fullName || '').toLowerCase().includes(q) ||
    (a.abhaAddress || '').toLowerCase().includes(q) ||
    (!!digits && ((a.abhaNumber || '').replace(/\D/g, '').includes(digits) || (a.mobile || '').replace(/\D/g, '').includes(digits))));
};
