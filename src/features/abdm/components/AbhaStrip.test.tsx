import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AbdmProfileShareItem } from '../services/abdmApi';

const getProfileShares = vi.fn();
vi.mock('../services/abdmApi', () => ({ abdmApi: { getProfileShares: (...a: unknown[]) => getProfileShares(...a) } }));

// The wizards talk to ABDM; here they are stand-ins that report what they were opened with.
vi.mock('./LinkExistingAbhaWizard', () => ({
  LinkExistingAbhaWizard: (p: { open: boolean; onLinked?: (x: unknown) => void }) =>
    p.open ? (
      <div data-testid="link-wizard">
        <button onClick={() => p.onLinked?.({ success: true, abhaNumber: '91-0000-0000-0001', fullName: 'Otp Person' })}>finish link</button>
      </div>
    ) : null,
}));
vi.mock('./CreateAbhaWizard', () => ({
  CreateAbhaWizard: (p: { open: boolean; onCreated?: (x: unknown) => void }) =>
    p.open ? <button data-testid="create-wizard" onClick={() => p.onCreated?.({ success: true, abhaNumber: '91-0000-0000-0002' })}>finish create</button> : null,
}));

import { AbhaStrip } from './AbhaStrip';

const scan: AbdmProfileShareItem = {
  profileShareId: 's1', abhaNumber: '91-1111-2222-3333', fullName: 'Asha Rao', gender: 'F',
  dateOfBirth: '05-03-1990', address: '12 Lake Road', statusCode: 'NEW', receivedAt: '2026-11-17T06:00:00',
} as AbdmProfileShareItem;

describe('AbhaStrip', () => {
  beforeEach(() => { getProfileShares.mockReset(); getProfileShares.mockResolvedValue({ items: [scan] }); });

  it('offers the three ways in and counts waiting scans', async () => {
    render(<AbhaStrip hospitalId="h1" abhaId="" onVerified={vi.fn()} onClear={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /Counter scans \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Has ABHA: verify/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create ABHA/ })).toBeInTheDocument();
    expect(getProfileShares).toHaveBeenCalledWith('h1', { status: 'NEW' });
  });

  it('picking a counter scan fills straight from the scan, without the OTP wizard', async () => {
    const onVerified = vi.fn();
    render(<AbhaStrip hospitalId="h1" abhaId="" onVerified={onVerified} onClear={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Counter scans \(1\)/ }));
    fireEvent.click(screen.getByRole('button', { name: /Asha Rao/ }));
    expect(screen.queryByTestId('link-wizard')).toBeNull();
    expect(onVerified).toHaveBeenCalledWith(expect.objectContaining({ abhaNumber: '91-1111-2222-3333', address: '12 Lake Road' }), 'scan');
  });

  it('verify by OTP and create report their own source', async () => {
    const onVerified = vi.fn();
    render(<AbhaStrip hospitalId="h1" abhaId="" onVerified={onVerified} onClear={vi.fn()} />);
    await screen.findByRole('button', { name: /Counter scans \(1\)/ });
    fireEvent.click(screen.getByRole('button', { name: /Has ABHA: verify/ }));
    expect(screen.getByTestId('link-wizard')).toBeInTheDocument();
    fireEvent.click(screen.getByText('finish link'));
    expect(onVerified).toHaveBeenLastCalledWith(expect.objectContaining({ abhaNumber: '91-0000-0000-0001' }), 'otp');
    fireEvent.click(screen.getByRole('button', { name: /Create ABHA/ }));
    fireEvent.click(screen.getByTestId('create-wizard'));
    expect(onVerified).toHaveBeenLastCalledWith(expect.objectContaining({ abhaNumber: '91-0000-0000-0002' }), 'created');
  });

  it('says when nobody is waiting', async () => {
    getProfileShares.mockResolvedValue({ items: [] });
    render(<AbhaStrip hospitalId="h1" abhaId="" onVerified={vi.fn()} onClear={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Counter scans/ }));
    expect(await screen.findByText(/No one is waiting/)).toBeInTheDocument();
  });

  it('shows the verified state with how it was verified, and Change clears it', () => {
    const onClear = vi.fn();
    render(<AbhaStrip hospitalId="h1" abhaId="91-1111-2222-3333" verified={{ abhaNumber: '91-1111-2222-3333', abhaAddress: 'asha@abdm', source: 'otp' }} onVerified={vi.fn()} onClear={onClear} />);
    expect(screen.getByText('ABHA verified')).toBeInTheDocument();
    expect(screen.getByText(/asha@abdm · verified by OTP/)).toBeInTheDocument();
    expect(getProfileShares).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('an ABHA that came with the patient record is shown as linked, not verified', async () => {
    render(<AbhaStrip hospitalId="h1" abhaId="91-9" verified={null} onVerified={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText('ABHA linked')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/from the patient record/)).toBeInTheDocument());
  });
});
