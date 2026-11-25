import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMyHospitals = vi.fn();
vi.mock('@/features/hospital/services/hospitalApi', () => ({ hospitalApi: { getMyHospitals: () => getMyHospitals() } }));

import { useAuthStore, refreshMyHospitals } from './authStore';

describe('refreshMyHospitals: a renamed hospital shows its new name without signing out', () => {
  beforeEach(() => {
    getMyHospitals.mockReset();
    useAuthStore.getState().setHospitals([{ hospitalId: 'h1', name: 'Test Hospitalyyy' }]);
  });

  it('replaces the session list with the server one', async () => {
    getMyHospitals.mockResolvedValue([{ hospitalId: 'h1', name: 'GLISAN Hospital' }]);
    await refreshMyHospitals();
    expect(useAuthStore.getState().hospitals[0].name).toBe('GLISAN Hospital');
  });

  it('keeps the list when the call fails or comes back empty', async () => {
    getMyHospitals.mockRejectedValueOnce(new Error('offline'));
    await refreshMyHospitals();
    getMyHospitals.mockResolvedValueOnce([]);
    await refreshMyHospitals();
    expect(useAuthStore.getState().hospitals[0].name).toBe('Test Hospitalyyy');
  });
});
