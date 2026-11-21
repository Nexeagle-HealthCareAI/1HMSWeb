// Turns an ABHA profile (from OTP verification, a counter scan or a fresh enrolment) into the
// values the Book-an-appointment patient form uses. Pure, so it is easy to test.

export type AbhaSource = 'scan' | 'otp' | 'created';

export interface AbhaProfileLike {
  abhaNumber?: string;
  abhaAddress?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobile?: string;
  address?: string;
  // Present when the profile came from a counter scan.
  profileShareId?: string;
}

export interface AbhaPrefill {
  name?: string;
  gender?: 'Male' | 'Female' | 'Other';
  age?: string;
  ageUnit?: 'Y' | 'M' | 'D';
  phone?: string;
  address?: string;
}

export const ABHA_SOURCE_LABEL: Record<AbhaSource, string> = {
  scan: 'shared by counter scan',
  otp: 'verified by OTP',
  created: 'created here just now',
};

export const mapAbhaGender = (g?: string): AbhaPrefill['gender'] => {
  const v = (g || '').trim().toLowerCase();
  if (!v) return undefined;
  if (v === 'm' || v === 'male') return 'Male';
  if (v === 'f' || v === 'female') return 'Female';
  return 'Other';
};

// ABDM sends date of birth as dd-MM-yyyy, yyyy-MM-dd or (when only the year is known) yyyy.
export const parseAbhaDob = (dob?: string): { date: Date; yearOnly: boolean } | null => {
  const v = (dob || '').trim();
  if (!v) return null;
  let m = /^(\d{4})$/.exec(v);
  if (m) return { date: new Date(Number(m[1]), 0, 1), yearOnly: true };
  let y: number, mo: number, d: number;
  m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(v);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(v);
    if (!m) return null;
    d = +m[1]; mo = +m[2]; y = +m[3];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getMonth() !== mo - 1) return null; // e.g. 31-02
  return { date, yearOnly: false };
};

export const ageFromDob = (dob: string | undefined, today: Date = new Date()): Pick<AbhaPrefill, 'age' | 'ageUnit'> => {
  const parsed = parseAbhaDob(dob);
  if (!parsed || parsed.date > today) return {};
  const { date, yearOnly } = parsed;
  if (yearOnly) return { age: String(today.getFullYear() - date.getFullYear()), ageUnit: 'Y' };
  let years = today.getFullYear() - date.getFullYear();
  let months = today.getMonth() - date.getMonth();
  if (today.getDate() < date.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years >= 1) return { age: String(years), ageUnit: 'Y' };
  if (months >= 1) return { age: String(months), ageUnit: 'M' };
  const days = Math.max(1, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
  return { age: String(days), ageUnit: 'D' };
};

// Only a full, unmasked Indian mobile is usable; ABDM often returns it masked (******3210).
export const cleanAbhaMobile = (mobile?: string): string | undefined => {
  const v = (mobile || '').trim();
  if (!v || /[^\d+\s-]/.test(v)) return undefined;
  let digits = v.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^\d{10}$/.test(digits) ? digits : undefined;
};

export const abhaPrefill = (profile: AbhaProfileLike, today: Date = new Date()): AbhaPrefill => ({
  name: profile.fullName?.trim() || undefined,
  gender: mapAbhaGender(profile.gender),
  ...ageFromDob(profile.dateOfBirth, today),
  phone: cleanAbhaMobile(profile.mobile),
  address: profile.address?.trim() || undefined,
});

// Fields the form should lock: only the ones ABHA actually supplied.
export const lockedByAbha = (p: AbhaPrefill) => ({
  name: !!p.name,
  gender: !!p.gender,
  age: !!p.age,
});
