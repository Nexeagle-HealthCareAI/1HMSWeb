import type { PermissionKey } from './boardAccess';

/**
 * Single source of truth for "where does this user land after sign-in / on `/`".
 *
 * Replaces three drifting copies (LoginPage's two effects/handlers, AppRoutes' RoleBasedRedirect,
 * RoleService.getRedirectPath), none of which knew about Pharmacist / Lab Technician /
 * Coordinator -- those roles fell through to a page they cannot open and were then logged out.
 *
 * A role's preferred landing is only used when the user actually holds the board's permission;
 * otherwise the first permitted board in LANDING_PRIORITY is used. Returns null when the user
 * has no permitted board at all (caller shows a "no access" screen -- never a silent logout).
 */

interface Landing {
  path: string;
  permission: PermissionKey;
}

const ROLE_LANDING: Record<string, Landing> = {
  Admin: { path: '/admin', permission: 'admin_panel' },
  AdminDoctor: { path: '/admin', permission: 'admin_panel' },
  Doctor: { path: '/dashboard', permission: 'doc_board' },
  Receptionist: { path: '/appointment-dashboard', permission: 'appointment_scheduler' },
  Nurse: { path: '/nursing-station', permission: 'nursing_station' },
  Accountant: { path: '/billing', permission: 'billing' },
  Pharmacist: { path: '/pharmacy-retail', permission: 'pharmacy' },
  'Lab Technician': { path: '/pathology', permission: 'pathology' },
  Coordinator: { path: '/ipd-workspace', permission: 'ipd' },
};

// Fallback for hospital-defined/custom roles and for roles whose preferred board is not granted.
const LANDING_PRIORITY: Landing[] = [
  { path: '/admin', permission: 'admin_panel' },
  { path: '/dashboard', permission: 'doc_board' },
  { path: '/appointment-dashboard', permission: 'appointment_scheduler' },
  { path: '/nursing-station', permission: 'nursing_station' },
  { path: '/ipd-workspace', permission: 'ipd' },
  { path: '/ot-board', permission: 'ot_board' },
  { path: '/icu-board', permission: 'icu_board' },
  { path: '/pharmacy-retail', permission: 'pharmacy' },
  { path: '/pathology', permission: 'pathology' },
  { path: '/inventory', permission: 'inventory' },
  { path: '/billing', permission: 'billing' },
  { path: '/patients', permission: 'patients' },
  { path: '/abdm', permission: 'abdm' },
  { path: '/leads', permission: 'leads' },
];

export function getLandingPath(
  roles: string[],
  permissions: string[],
  isMobile = false,
): string | null {
  const granted = new Set(permissions);

  // Doctors on a phone prefer the appointment queue, but only if they were granted that board.
  if (isMobile && roles.includes('Doctor') && !roles.includes('AdminDoctor') && granted.has('appointment_scheduler')) {
    return '/appointment-dashboard';
  }

  for (const role of roles) {
    const landing = ROLE_LANDING[role];
    if (landing && granted.has(landing.permission)) return landing.path;
  }

  return LANDING_PRIORITY.find(l => granted.has(l.permission))?.path ?? null;
}
