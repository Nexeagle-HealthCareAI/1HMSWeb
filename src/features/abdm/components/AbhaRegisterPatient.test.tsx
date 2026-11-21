import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const matchAbhaPatient = vi.fn();
const registerAbhaPatient = vi.fn();
vi.mock('../services/abdmApi', () => ({
  abdmApi: {
    matchAbhaPatient: (...a: unknown[]) => matchAbhaPatient(...a),
    registerAbhaPatient: (...a: unknown[]) => registerAbhaPatient(...a),
    getAbhaCardBlob: vi.fn(),
    downloadBlob: vi.fn(),
    requestUpdateMobileOtp: vi.fn(),
    verifyUpdateMobileOtp: vi.fn(),
    handleProfileShare: vi.fn(() => Promise.resolve({ success: true })),
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { AbhaRegisterPatient } from './AbhaRegisterPatient';

// Invented values only.
const profile = {
  abhaNumber: '91-0000-0000-0001', abhaAddress: 'asha_1@sbx', fullName: 'Asha Kumari', gender: 'F', dateOfBirth: '05-03-1990',
  mobile: '9000000001', address: '12 Lake Road', district: 'PURNIA', state: 'BIHAR', city: 'Baisi', pincode: '854315',
};

describe('AbhaRegisterPatient', () => {
  beforeEach(() => { matchAbhaPatient.mockReset(); registerAbhaPatient.mockReset(); });

  it('fills the form from the ABHA with name, birth date and gender read only (VRFY_ABHA_306)', async () => {
    matchAbhaPatient.mockResolvedValue({ success: true, candidates: [] });
    registerAbhaPatient.mockResolvedValue({ success: true, patientId: 'PTID00000010', created: true });
    const onFinished = vi.fn();
    render(<AbhaRegisterPatient hospitalId="h1" profile={profile} linkToken="t1" onFinished={onFinished} />);

    const name = await screen.findByDisplayValue('Asha Kumari');
    expect(name).toBeDisabled();
    expect(screen.getByDisplayValue('05-03-1990')).toBeDisabled();
    expect(screen.getByDisplayValue('Female')).toBeDisabled();
    expect(screen.getByLabelText('District')).toHaveValue('PURNIA');
    expect(screen.getByLabelText('District')).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Register patient/ }));
    await waitFor(() => expect(registerAbhaPatient).toHaveBeenCalled());
    const sent = registerAbhaPatient.mock.calls[0][0];
    expect(sent).toMatchObject({ hospitalId: 'h1', linkToken: 't1', district: 'PURNIA' });
    expect(sent).not.toHaveProperty('fullName');
    expect(await screen.findByText(/PTID00000010/)).toBeInTheDocument();
  });

  it('shows an ABHA already on a patient as linked, with a comparison, and offers no new registration (VRFY_ABHA_308)', async () => {
    matchAbhaPatient.mockResolvedValue({
      success: true, candidates: [],
      alreadyLinked: { patientId: 'PTID00000001', fullName: 'Asha Kumari', mobile: '9111111111', sex: 'Female', abhaId: '91-0000-0000-0001', matchedOn: ['ABHA'] },
    });
    render(<AbhaRegisterPatient hospitalId="h1" profile={profile} linkToken="t1" onFinished={vi.fn()} />);

    expect(await screen.findByText(/This ABHA profile is already linked to HMIS Beneficiary ID\./)).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /In HMIS \(PTID00000001\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Register patient/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update PTID00000001 from this ABHA/ })).toBeInTheDocument();
  });

  it('offers patients who may be this person, and links the one chosen (CRT_ABHA_116)', async () => {
    matchAbhaPatient.mockResolvedValue({
      success: true,
      candidates: [
        { patientId: 'PTID00000003', fullName: 'Asha Kumari', mobile: '9000000001', sex: 'Female', age: 36, ageUnit: 'Y', matchedOn: ['MOBILE', 'NAME'] },
        { patientId: 'PTID00000004', fullName: 'Asha Kumary', sex: 'Female', abhaId: '91-0000-0000-0099', matchedOn: ['NAME', 'AGE', 'SEX'] },
      ],
    });
    registerAbhaPatient.mockResolvedValue({ success: true, patientId: 'PTID00000003', created: false });
    render(<AbhaRegisterPatient hospitalId="h1" profile={profile} linkToken="t1" onFinished={vi.fn()} />);

    const radios = await screen.findAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[1]).toBeDisabled(); // holds another ABHA
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Link ABHA to PTID00000003/ }));
    await waitFor(() => expect(registerAbhaPatient).toHaveBeenCalled());
    expect(registerAbhaPatient.mock.calls[0][0]).toMatchObject({ patientId: 'PTID00000003' });
  });

  it('asks before updating the ABHA mobile when the record mobile differs (VRFY_ABHA_101)', async () => {
    matchAbhaPatient.mockResolvedValue({ success: true, candidates: [] });
    render(<AbhaRegisterPatient hospitalId="h1" profile={profile} linkToken="t1" sessionTxnId="s1" onFinished={vi.fn()} />);
    const mobile = await screen.findByLabelText('Mobile');
    fireEvent.change(mobile, { target: { value: '9222222222' } });
    expect(screen.getByText(/Update the ABHA profile's mobile/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });
});
