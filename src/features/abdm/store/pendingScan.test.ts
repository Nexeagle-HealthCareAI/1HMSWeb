import { describe, it, expect, beforeEach } from 'vitest';
import { PENDING_SCAN_MAX_AGE_MS, usePendingAbhaScan } from './pendingScan';
import type { AbdmProfileShareItem } from '../services/abdmApi';

const scan = { profileShareId: 's1', abhaNumber: '91-0000-0000-0001', statusCode: 'NEW', receivedAt: '2026-11-17T06:00:00' } as AbdmProfileShareItem;

describe('usePendingAbhaScan', () => {
  beforeEach(() => usePendingAbhaScan.setState({ scan: null, setAt: 0 }));

  it('hands the scan over once, then is empty', () => {
    usePendingAbhaScan.getState().setScan(scan);
    expect(usePendingAbhaScan.getState().take()).toBe(scan);
    expect(usePendingAbhaScan.getState().take()).toBeNull();
    expect(usePendingAbhaScan.getState().scan).toBeNull();
  });

  it('expires, so a scan left behind cannot fill a later booking', () => {
    usePendingAbhaScan.getState().setScan(scan, 1000);
    expect(usePendingAbhaScan.getState().peek(1000 + PENDING_SCAN_MAX_AGE_MS)).toBe(scan);
    expect(usePendingAbhaScan.getState().take(1001 + PENDING_SCAN_MAX_AGE_MS)).toBeNull();
    expect(usePendingAbhaScan.getState().scan).toBeNull();
  });

  it('can be cancelled before it is used', () => {
    usePendingAbhaScan.getState().setScan(scan);
    usePendingAbhaScan.getState().setScan(null);
    expect(usePendingAbhaScan.getState().take()).toBeNull();
  });
});
