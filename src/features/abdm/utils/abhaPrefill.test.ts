import { describe, it, expect } from 'vitest';
import { abhaPrefill, ageFromDob, cleanAbhaMobile, lockedByAbha, mapAbhaGender, parseAbhaDob } from './abhaPrefill';

const today = new Date(2026, 10, 17); // 17 Nov 2026

describe('abhaPrefill', () => {
  it('maps ABDM gender codes', () => {
    expect(mapAbhaGender('M')).toBe('Male');
    expect(mapAbhaGender('female')).toBe('Female');
    expect(mapAbhaGender('T')).toBe('Other');
    expect(mapAbhaGender('')).toBeUndefined();
  });

  it('reads both date orders and a year-only date of birth', () => {
    expect(parseAbhaDob('05-03-1990')?.date).toEqual(new Date(1990, 2, 5));
    expect(parseAbhaDob('1990-03-05')?.date).toEqual(new Date(1990, 2, 5));
    expect(parseAbhaDob('1990')?.yearOnly).toBe(true);
    expect(parseAbhaDob('31-02-1990')).toBeNull();
    expect(parseAbhaDob('soon')).toBeNull();
  });

  it('works out age in years, months or days', () => {
    expect(ageFromDob('18-11-1990', today)).toEqual({ age: '35', ageUnit: 'Y' });
    expect(ageFromDob('17-11-1990', today)).toEqual({ age: '36', ageUnit: 'Y' });
    expect(ageFromDob('2026-06-10', today)).toEqual({ age: '5', ageUnit: 'M' });
    expect(ageFromDob('2026-11-07', today)).toEqual({ age: '10', ageUnit: 'D' });
    expect(ageFromDob('1980', today)).toEqual({ age: '46', ageUnit: 'Y' });
    expect(ageFromDob('2030-01-01', today)).toEqual({});
    expect(ageFromDob(undefined, today)).toEqual({});
  });

  it('keeps only a full, unmasked mobile', () => {
    expect(cleanAbhaMobile('9876543210')).toBe('9876543210');
    expect(cleanAbhaMobile('+91 98765 43210')).toBe('9876543210');
    expect(cleanAbhaMobile('******3210')).toBeUndefined();
    expect(cleanAbhaMobile('XXXXXX3210')).toBeUndefined();
    expect(cleanAbhaMobile('')).toBeUndefined();
  });

  it('builds the form values and locks only what ABHA supplied', () => {
    const p = abhaPrefill({ fullName: ' Asha Rao ', gender: 'F', dateOfBirth: '05-03-1990', mobile: '******3210' }, today);
    expect(p).toMatchObject({ name: 'Asha Rao', gender: 'Female', age: '36', ageUnit: 'Y' });
    expect(p.phone).toBeUndefined();
    expect(lockedByAbha(p)).toEqual({ name: true, gender: true, age: true });
    expect(lockedByAbha(abhaPrefill({ fullName: 'Asha' }, today))).toEqual({ name: true, gender: false, age: false });
  });
});
