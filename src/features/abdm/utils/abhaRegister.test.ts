import { describe, it, expect } from 'vitest';
import { compareRows, holdsOtherAbha, initialForm, maskMobile, sameMobile } from './abhaRegister';

// Invented values only.
const abha = {
  abhaNumber: '91-0000-0000-0001', fullName: 'Asha Kumari', gender: 'F', dateOfBirth: '05-03-1990',
  mobile: '9000000001', address: '12 Lake Road', district: 'PURNIA', state: 'BIHAR', city: 'Baisi', pincode: '854315',
};
const patient = {
  patientId: 'PTID00000001', fullName: 'Asha Kumari', mobile: '9111111111', sex: 'Female', age: 36, ageUnit: 'Y',
  addressLine: 'Ward 4', abhaId: '91-0000-0000-0001', matchedOn: ['ABHA'],
};

describe('registering a patient from an ABHA', () => {
  it('starts a new registration from what the ABHA holds', () => {
    expect(initialForm(abha)).toEqual({
      mobile: '9000000001', email: '', addressLine: '12 Lake Road', city: 'Baisi', district: 'PURNIA', state: 'BIHAR', pincode: '854315',
    });
  });

  it('starts a link from the patient record, the ABHA filling its gaps', () => {
    const f = initialForm(abha, patient);
    expect(f.mobile).toBe('9111111111');
    expect(f.addressLine).toBe('Ward 4');
    expect(f.district).toBe('PURNIA');
  });

  it('compares the ABHA with the patient record (VRFY_ABHA_308)', () => {
    const rows = compareRows(abha, patient);
    expect(rows.find(r => r.label === 'Name')?.differs).toBe(false);
    expect(rows.find(r => r.label === 'Mobile')?.differs).toBe(true);
    expect(rows.find(r => r.label === 'Gender')?.hmis).toBe('Female');
    expect(rows.find(r => r.label === 'Mobile')?.abha).toBe('******0001');
  });

  it('keeps one ABHA per patient', () => {
    expect(holdsOtherAbha({ ...patient, abhaId: '91-0000-0000-0099' }, abha.abhaNumber)).toBe(true);
    expect(holdsOtherAbha(patient, '91000000000001')).toBe(false);
    expect(holdsOtherAbha({ ...patient, abhaId: undefined }, abha.abhaNumber)).toBe(false);
  });

  it('compares and masks mobiles by their last ten digits', () => {
    expect(sameMobile('+91 9000000001', '9000000001')).toBe(true);
    expect(sameMobile('9000000002', '9000000001')).toBe(false);
    expect(maskMobile('9000000001')).toBe('******0001');
  });
});
