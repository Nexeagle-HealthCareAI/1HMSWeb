import { describe, expect, it } from 'vitest';
import { getLandingPath } from './landing';

// Permission sets mirror seed_global_min.sql.
const PERMS = {
  Admin: ['admin_panel', 'appointment_scheduler', 'billing', 'ipd', 'pharmacy', 'pathology'],
  Receptionist: ['appointment_scheduler', 'appointment_booking', 'billing', 'doctor_calendar', 'abdm', 'print_preview'],
  Nurse: ['appointment_scheduler', 'billing', 'ipd', 'nursing_station', 'ot_board', 'icu_board', 'inventory'],
  Doctor: ['doc_board', 'ipd', 'nursing_station', 'patients', 'billing', 'pharmacy'],
  Accountant: ['billing', 'print_preview'],
  Pharmacist: ['pharmacy', 'print_preview'],
  'Lab Technician': ['pathology', 'print_preview'],
  Coordinator: ['ot_board', 'icu_board', 'inventory', 'ipd', 'print_preview'],
} as const;

describe('getLandingPath', () => {
  it.each([
    ['Admin', '/admin'],
    ['Receptionist', '/appointment-dashboard'],
    ['Nurse', '/nursing-station'],
    ['Doctor', '/dashboard'],
    ['Accountant', '/billing'],
    ['Pharmacist', '/pharmacy-retail'],
    ['Lab Technician', '/pathology'],
    ['Coordinator', '/ipd-workspace'],
  ] as const)('lands %s on %s', (role, path) => {
    expect(getLandingPath([role], [...PERMS[role]])).toBe(path);
  });

  it('never returns a page the user lacks permission for', () => {
    // Doctor on a phone has no appointment_scheduler -> stays on the doctor board.
    expect(getLandingPath(['Doctor'], [...PERMS.Doctor], true)).toBe('/dashboard');
  });

  it('sends a phone-sized Doctor with the scheduler permission to the appointment queue', () => {
    expect(getLandingPath(['Doctor'], ['doc_board', 'appointment_scheduler'], true)).toBe('/appointment-dashboard');
  });

  it('falls back to the first permitted board for unknown / custom roles', () => {
    expect(getLandingPath(['Ward Clerk'], ['inventory', 'billing'])).toBe('/inventory');
  });

  it('falls back when the role preferred board was not granted', () => {
    expect(getLandingPath(['Pharmacist'], ['pathology'])).toBe('/pathology');
  });

  it('returns null (no-access screen) when nothing is permitted', () => {
    expect(getLandingPath(['Pharmacist'], [])).toBeNull();
    expect(getLandingPath([], ['print_preview'])).toBeNull();
  });
});
