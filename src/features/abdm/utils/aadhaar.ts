// The check digit UIDAI puts at the end of every Aadhaar number (Verhoeff). A mistyped number is
// stopped here, before any call to ABDM (test cases CRT_ABHA_104 and VRFY_ABHA_401). The server
// checks again.

const MULTIPLY = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const PERMUTE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** Twelve digits, not starting with 0 or 1, with a correct check digit. Spaces and dashes are ignored. */
export const isValidAadhaar = (value: string | null | undefined): boolean => {
  const digits = (value ?? '').replace(/[\s-]/g, '');
  if (!/^[2-9]\d{11}$/.test(digits)) return false;
  let check = 0;
  for (let i = 0; i < digits.length; i += 1) {
    check = MULTIPLY[check][PERMUTE[i % 8][Number(digits[digits.length - 1 - i])]];
  }
  return check === 0;
};

/** name@abdm (name@sbx in the sandbox). */
export const isAbhaAddress = (value: string | null | undefined): boolean =>
  /^[a-z0-9][a-z0-9_.]+[a-z0-9]@(abdm|sbx)$/.test((value ?? '').trim().toLowerCase());

/** Digits only, cut to a length: OTP, mobile and Aadhaar boxes take nothing else (CRT_ABHA_105). */
export const onlyDigits = (value: string, max: number): string => value.replace(/\D/g, '').slice(0, max);

export const INVALID_AADHAAR = 'That is not a valid Aadhaar number. Check the 12 digits and try again.';
