import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const put = vi.fn();

vi.mock('@/services/ipdApiClient', () => ({ ipdApiClient: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } }));
vi.mock('@/store/authStore', () => ({ useAuthStore: { getState: () => ({ getHospitalId: () => 'H1' }) } }));

import { shiftApi } from './shiftApi';

const KEY = 'easyhms_shifts_H1';
const legacy = [{ shiftCode: 'NIGHT12', label: '12h Night', isActive: true, sortOrder: 10 }];

describe('shiftApi (server-backed nursing shifts)', () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
    localStorage.clear();
  });

  it('returns the hospital shifts stored on the server and drops any stale local copy', async () => {
    localStorage.setItem(KEY, JSON.stringify(legacy));
    get.mockResolvedValue({ shifts: [{ shiftCode: 'MORNING', label: 'Morning', isActive: true, sortOrder: 10 }] });

    const shifts = await shiftApi.getShifts();

    expect(shifts.map(s => s.shiftCode)).toEqual(['MORNING']);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(put).not.toHaveBeenCalled();
  });

  it('migrates a legacy browser-local list to the server once, then removes it', async () => {
    localStorage.setItem(KEY, JSON.stringify(legacy));
    get.mockResolvedValue({ shifts: [] });
    put.mockResolvedValue({ success: true });

    const shifts = await shiftApi.getShifts();

    expect(shifts).toEqual(legacy);
    expect(put).toHaveBeenCalledWith('/nursing-station/shifts', legacy, { params: { hospitalId: 'H1' } });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps the local copy when the migration is rejected (e.g. a non-admin user)', async () => {
    localStorage.setItem(KEY, JSON.stringify(legacy));
    get.mockResolvedValue({ shifts: [] });
    put.mockRejectedValue(new Error('403'));

    const shifts = await shiftApi.getShifts();

    expect(shifts).toEqual(legacy);
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('falls back to the default Morning/Evening/Night shifts when nothing is stored anywhere', async () => {
    get.mockResolvedValue({ shifts: [] });

    const shifts = await shiftApi.getShifts();

    expect(shifts.map(s => s.shiftCode)).toEqual(['MORNING', 'EVENING', 'NIGHT']);
    expect(put).not.toHaveBeenCalled();
  });

  it('serves defaults (not an error) when the API is unreachable', async () => {
    get.mockRejectedValue(new Error('offline'));

    const shifts = await shiftApi.getShifts();

    expect(shifts.map(s => s.shiftCode)).toEqual(['MORNING', 'EVENING', 'NIGHT']);
  });

  it('addShift rejects a duplicate code and saves new shifts to the server', async () => {
    get.mockResolvedValue({ shifts: [{ shiftCode: 'MORNING', label: 'Morning', isActive: true, sortOrder: 10 }] });
    put.mockResolvedValue({ success: true });

    await expect(shiftApi.addShift({ shiftCode: 'morning', label: 'Dup', isActive: true })).rejects.toThrow(/already exists/);

    const updated = await shiftApi.addShift({ shiftCode: 'late', label: 'Late', isActive: true });
    expect(updated.map(s => s.shiftCode)).toEqual(['MORNING', 'LATE']);
    expect(put).toHaveBeenCalledTimes(1);
  });
});
