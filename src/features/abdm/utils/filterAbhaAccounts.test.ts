import { describe, it, expect } from 'vitest';
import { filterAbhaAccounts } from './filterAbhaAccounts';
import type { AbhaAccountSummary } from '../services/abdmApi';

const acc = (o: Partial<AbhaAccountSummary>) => ({ abhaAccountId: Math.random().toString(), createdAt: '2026-11-01', ...o }) as AbhaAccountSummary;
const list = [
  acc({ fullName: 'Asha Rao', abhaNumber: '91-1111-2222-3333', abhaAddress: 'asha@abdm', mobile: '9876543210' }),
  acc({ fullName: 'Vikram Shah', abhaNumber: '91-4444-5555-6666', mobile: '9000000001' }),
];

describe('filterAbhaAccounts', () => {
  it('returns everything for an empty search', () => expect(filterAbhaAccounts(list, '  ')).toHaveLength(2));
  it('matches name and ABHA address without case', () => {
    expect(filterAbhaAccounts(list, 'ASHA').map(a => a.fullName)).toEqual(['Asha Rao']);
    expect(filterAbhaAccounts(list, '@abdm')).toHaveLength(1);
  });
  it('matches ABHA number with or without dashes, and mobile', () => {
    expect(filterAbhaAccounts(list, '4444-5555').map(a => a.fullName)).toEqual(['Vikram Shah']);
    expect(filterAbhaAccounts(list, '44445555')).toHaveLength(1);
    expect(filterAbhaAccounts(list, '98765')).toHaveLength(1);
  });
  it('returns nothing when no account matches', () => expect(filterAbhaAccounts(list, 'zzz')).toHaveLength(0));
});
