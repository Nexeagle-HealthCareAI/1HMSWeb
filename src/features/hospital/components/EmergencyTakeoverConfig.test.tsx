import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Settings -> Emergency takeover (Vita, vision Phase 3): the hospital's opt-in. Switching on needs the terms; saving sends it to
// the Doctor Dekho team for verification; the server's refusal is shown as is.

// Radix switches and checkboxes measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...a: unknown[]) => toast(...a), useToast: () => ({ toast }) }));
vi.mock('@/components/map/MapLocationPicker', () => ({
  MapLocationPicker: (p: { onLocationChange: (lat: number, lng: number) => void }) => (
    <button type="button" onClick={() => p.onLocationChange(22.5801, 88.4202)}>Drop pin</button>
  ),
}));
const get = vi.fn();
const put = vi.fn();
vi.mock('@/services/axiosClient', () => ({ apiClient: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } }));
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ hospitalId: 'h-1' }) }));

import { EmergencyTakeoverConfig } from './EmergencyTakeoverConfig';

const NEW = {
  success: true, currentTermsVersion: '2026-10', capabilityOptions: [],
  settings: { hospitalId: 'h-1', name: 'Salt Lake Care', isEnabled: false, emergencyPhone: '03340001111', latitude: 22.58, longitude: 88.42,
    city: 'Kolkata', is24x7: true, capabilities: [], verificationStatus: 'NEW' },
};

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  toast.mockClear();
  get.mockResolvedValue(NEW);
});

describe('Emergency takeover settings', () => {
  it('starts from the hospital\'s own details and says it is not set up', async () => {
    render(<EmergencyTakeoverConfig />);
    expect(await screen.findByText('Not set up')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/hospitals/h-1/emergency-settings');
    expect(screen.getByLabelText('24x7 emergency phone *')).toHaveValue('03340001111');
    expect(screen.queryByText('Shown to patients')).toBeNull();
  });

  it('does not switch on without the terms', async () => {
    render(<EmergencyTakeoverConfig />);
    await screen.findByText('Not set up');
    await userEvent.click(screen.getByRole('switch', { name: 'Show this hospital in emergencies' }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Accept the emergency takeover terms');
    expect(put).not.toHaveBeenCalled();
  });

  it('saves the opt-in with the terms and waits for verification', async () => {
    put.mockResolvedValue({
      ...NEW, message: 'Saved. Doctor Dekho will check the details before patients can see your hospital in an emergency.',
      sentForVerification: true,
      settings: { ...NEW.settings, isEnabled: true, alertWhatsApp: '9830000001', capabilities: ['cardiac'], verificationStatus: 'PENDING',
        termsVersion: '2026-10', termsAcceptedAt: '2026-10-25T00:00:00Z' },
    });
    render(<EmergencyTakeoverConfig />);
    await screen.findByText('Not set up');
    await userEvent.click(screen.getByRole('switch', { name: 'Show this hospital in emergencies' }));
    await userEvent.type(screen.getByLabelText('WhatsApp number for alerts *'), '98300 00001');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cardiac' }));
    await userEvent.click(screen.getByRole('button', { name: 'Drop pin' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /I accept the emergency takeover terms/ }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    const [url, body] = put.mock.calls[0];
    expect(url).toBe('/hospitals/h-1/emergency-settings');
    expect(body).toMatchObject({
      isEnabled: true, acceptTerms: true, emergencyPhone: '03340001111', alertWhatsApp: '98300 00001', capabilities: ['cardiac'],
      latitude: 22.5801, longitude: 88.4202, is24x7: true, openTime: null, closeTime: null,
    });
    expect(await screen.findByText('Waiting for verification')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /I accept/ })).toBeNull();          // accepted: not asked again
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Emergency takeover saved' }));
  });

  it('asks for hours when not 24x7', async () => {
    render(<EmergencyTakeoverConfig />);
    await screen.findByText('Not set up');
    expect(screen.queryByLabelText('Opens')).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Emergency open 24x7' }));
    expect(screen.getByLabelText('Opens')).toBeInTheDocument();
    expect(screen.getByLabelText('Closes')).toBeInTheDocument();
  });

  it('shows the server\'s reason when the save is refused', async () => {
    put.mockRejectedValue({ response: { status: 400, data: { message: 'Only a hospital admin can change the emergency takeover.' } } });
    render(<EmergencyTakeoverConfig />);
    await screen.findByText('Not set up');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only a hospital admin can change the emergency takeover.');
  });

  it('shows a verified listing as shown to patients, with the team\'s note hidden once verified', async () => {
    get.mockResolvedValue({ ...NEW, settings: { ...NEW.settings, isEnabled: true, verificationStatus: 'VERIFIED', listed: true,
      termsVersion: '2026-10', verificationNote: 'old note' } });
    render(<EmergencyTakeoverConfig />);
    expect(await screen.findByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Shown to patients')).toBeInTheDocument();
    expect(screen.queryByText(/old note/)).toBeNull();
  });
});
