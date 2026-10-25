import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Settings -> Patient visit guide (Vita, vision Phase 4): read, edit, preview what the patient reads, save; the server's refusal shows.

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...a: unknown[]) => toast(...a), useToast: () => ({ toast }) }));
const get = vi.fn();
const put = vi.fn();
vi.mock('@/services/axiosClient', () => ({ apiClient: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } }));
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ hospitalId: 'h-1' }) }));

import { VisitGuideConfig } from './VisitGuideConfig';

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  toast.mockClear();
  get.mockResolvedValue({ success: true, hasMapPin: true, guide: { landmark: 'Opposite City Centre' } });
});

describe('Patient visit guide', () => {
  it('loads, previews what the patient reads and saves', async () => {
    put.mockImplementation((_url: string, body: object) => Promise.resolve({ success: true, hasMapPin: true, guide: body }));
    render(<VisitGuideConfig />);
    expect(await screen.findByLabelText('Landmark')).toHaveValue('Opposite City Centre');
    expect(get).toHaveBeenCalledWith('/hospitals/h-1/visit-guide');
    await userEvent.type(screen.getByLabelText('OPD location'), '1st floor, left of the lift');
    expect(screen.getByText(/Opposite City Centre\. 1st floor, left of the lift\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][0]).toBe('/hospitals/h-1/visit-guide');
    expect(put.mock.calls[0][1]).toMatchObject({ landmark: 'Opposite City Centre', opdLocation: '1st floor, left of the lift' });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Patient visit guide saved' }));
  });

  it('asks for the map pin when the hospital has none', async () => {
    get.mockResolvedValue({ success: true, hasMapPin: false, guide: {} });
    render(<VisitGuideConfig />);
    expect(await screen.findByText(/Set the hospital's map pin/)).toBeInTheDocument();
  });

  it('shows the server\'s reason when the save is refused', async () => {
    put.mockRejectedValue({ response: { status: 400, data: { message: 'Only a hospital admin can change the patient visit guide.' } } });
    render(<VisitGuideConfig />);
    await screen.findByLabelText('Landmark');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only a hospital admin can change the patient visit guide.');
  });
});
