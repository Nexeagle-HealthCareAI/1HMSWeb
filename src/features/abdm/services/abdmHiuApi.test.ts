import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/axiosClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

import { ABDM_RECORD_TYPES, abdmHiuApi, abdmHiuStatusText, defaultAskDates } from './abdmHiuApi';
import { apiClient } from '@/services/axiosClient';

describe('abdmHiuApi', () => {
  it('starts the request form with the last two years, kept for 30 days', () => {
    expect(defaultAskDates(new Date('2026-11-17T08:00:00Z'))).toEqual({ from: '2024-11-17', to: '2026-11-17', eraseAt: '2026-12-17' });
  });

  it('has words for every status and the eight ABDM record types', () => {
    expect(Object.keys(abdmHiuStatusText).sort()).toEqual(['DENIED', 'EXPIRED', 'FAILED', 'GRANTED', 'REQUESTED', 'REVOKED']);
    expect(ABDM_RECORD_TYPES).toHaveLength(8);
  });

  it('escapes what it puts in a URL', () => {
    void abdmHiuApi.getRecords('h 1', 'P&1');
    expect(apiClient.get).toHaveBeenCalledWith('/abdm/hiu/records?hospitalId=h%201&patientId=P%261');
    void abdmHiuApi.checkConsent('h 1', 'c/1');
    expect(apiClient.post).toHaveBeenCalledWith('/abdm/hiu/consents/c%2F1/check?hospitalId=h%201', {});
  });
});
