import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const get = vi.fn();
const post = vi.fn();
const logout = vi.fn();
vi.mock('@/services/axiosClient', () => ({ apiClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
vi.mock('@/hooks/useLogout', () => ({ useLogout: () => logout }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
// The dropdown parts are plain elements here; the menu itself is not under test.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={() => onSelect?.()}>{children}</button>
  ),
}));

import {
  TesterResetDialog, TesterResetMenuItem, isProductionSite, loadTesterStatus, resetTesterStatus, useTesterReset,
} from './TesterResetMenuItem';

const tester = { available: true, isTester: true, maskedMobile: '90******01' };
const dryRun = { success: true, hospitals: ['Test Hospital'], users: 1, tables: [{ table: 'dbo.users', rows: 1 }], totalRows: 12 };

describe('Reset test account (Dev only)', () => {
  beforeEach(() => {
    resetTesterStatus();
    get.mockReset();
    post.mockReset();
    logout.mockReset();
  });

  it('shows nothing for a user who is not a tester', async () => {
    get.mockResolvedValue({ available: true, isTester: false });
    render(<TesterResetMenuItem />);
    await waitFor(() => expect(get).toHaveBeenCalledWith('internal/tester-accounts/me'));
    expect(screen.queryByText('Reset test account')).toBeNull();
  });

  it('shows nothing when the API has no such route (production answers 404)', async () => {
    get.mockRejectedValue({ response: { status: 404 } });
    render(<TesterResetMenuItem />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByText('Reset test account')).toBeNull();
  });

  it('never asks from the production site', async () => {
    expect(isProductionSite('1hms.nexeagle.com')).toBe(true);
    expect(isProductionSite('1hms-dev.nexeagle.com')).toBe(false);
    await loadTesterStatus('1hms.nexeagle.com');
    expect(get).not.toHaveBeenCalled();
  });

  it('for a tester: dry run first, then reset, sign out and back to sign-up', async () => {
    get.mockResolvedValue(tester);
    post.mockImplementation((_url: string, body: { dryRun: boolean }) => Promise.resolve(body.dryRun ? dryRun : { ...dryRun }));
    render(<><TesterResetMenuItem /><TesterResetDialog /></>);

    fireEvent.click(await screen.findByText('Reset test account'));
    expect(useTesterReset.getState().open).toBe(true);
    expect(await screen.findByTestId('tester-reset-preview')).toHaveTextContent('Test Hospital');
    expect(post).toHaveBeenCalledWith('internal/tester-accounts/reset-me', { dryRun: true });
    expect(post).not.toHaveBeenCalledWith('internal/tester-accounts/reset-me', { dryRun: false });

    fireEvent.click(screen.getByText('Reset and sign out'));
    await waitFor(() => expect(logout).toHaveBeenCalledWith({ redirectTo: '/login' }));
    expect(post).toHaveBeenCalledWith('internal/tester-accounts/reset-me', { dryRun: false });
  });
});
