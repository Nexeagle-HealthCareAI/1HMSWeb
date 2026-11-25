import { describe, it, expect } from 'vitest';
import { abhaAddressRules, isAbhaAddress, isValidAadhaar, onlyDigits } from './aadhaar';

// No number that passes the check is written here: an Aadhaar-looking number in a repository may be
// somebody's. The one valid ending of a stem is worked out by the test.
const validFrom = (firstEleven: string) => {
  const valid = Array.from({ length: 10 }, (_, d) => `${firstEleven}${d}`).filter(isValidAadhaar);
  expect(valid).toHaveLength(1);
  return valid[0];
};

describe('isValidAadhaar', () => {
  it('accepts a number with a correct check digit, with or without spaces', () => {
    for (const stem of ['23456789012', '99999999001', '50000000000']) {
      const n = validFrom(stem);
      expect(isValidAadhaar(`${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8)}`)).toBe(true);
    }
  });

  it('refuses a mistyped number before anything is sent', () => {
    const n = validFrom('23456789012');
    for (let i = 1; i < 12; i += 1) {
      const wrong = n.slice(0, i) + ((Number(n[i]) + 1) % 10) + n.slice(i + 1);
      expect(isValidAadhaar(wrong), `digit ${i} wrong`).toBe(false);
    }
    for (let i = 1; i < 11; i += 1) {
      if (n[i] === n[i + 1]) continue;
      const swapped = n.slice(0, i) + n[i + 1] + n[i] + n.slice(i + 2);
      expect(isValidAadhaar(swapped), `digits ${i} and ${i + 1} swapped`).toBe(false);
    }
    expect(isValidAadhaar('123412341234')).toBe(false); // starts with 1
    expect(isValidAadhaar('23456789012')).toBe(false);
    expect(isValidAadhaar('23456789012a')).toBe(false);
    expect(isValidAadhaar('')).toBe(false);
    expect(isValidAadhaar(undefined)).toBe(false);
  });
});

describe('isAbhaAddress', () => {
  it('knows an ABHA address from a number or a half-typed one', () => {
    expect(isAbhaAddress('asha.rao@abdm')).toBe(true);
    expect(isAbhaAddress(' Asha_Rao1@SBX ')).toBe(true);
    expect(isAbhaAddress('asha')).toBe(false);
    expect(isAbhaAddress('as@abdm')).toBe(false);
    expect(isAbhaAddress('asha@gmail')).toBe(false);
    expect(isAbhaAddress('asha.@abdm')).toBe(false);
    expect(isAbhaAddress('91-1234-5678-9012')).toBe(false);
  });
});

describe('onlyDigits (CRT_ABHA_105: the OTP box takes digits only)', () => {
  it('drops letters and special characters and cuts to the length', () => {
    expect(onlyDigits('12a4!5', 6)).toBe('1245');
    expect(onlyDigits('abcdef', 6)).toBe('');
    expect(onlyDigits('12345678', 6)).toBe('123456');
  });
});

describe('abhaAddressRules (CRT_ABHA_112)', () => {
  const met = (name: string) => abhaAddressRules(name, '@sbx').map(r => r.met);
  it('passes an address that keeps every rule', () => expect(met('asha.k_90')).toEqual([true, true, true]));
  it('counts the suffix in the length', () => {
    expect(met('abc')[0]).toBe(false);
    expect(met('abcd')[0]).toBe(true);
    expect(met('abcdefghijklmno')[0]).toBe(false);
  });
  it('allows one dot and one underscore, neither first nor last', () => {
    expect(met('as.ha.k')[1]).toBe(false);
    expect(met('as_h_a')[1]).toBe(false);
    expect(met('asha-k')[1]).toBe(false);
    expect(met('.ashak')[2]).toBe(false);
    expect(met('ashak_')[2]).toBe(false);
  });
});

