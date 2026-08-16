import type { LucideIcon } from 'lucide-react';
import {
  Shield,
  Crown,
  LayoutDashboard,
  Calendar,
  Users,
  Hotel,
  IndianRupee,
  FileBadge2,
  FlaskConical,
  Pill,
  Boxes,
  Activity as ActivityIcon,
  HeartPulse,
  ClipboardList,
  Megaphone,
} from 'lucide-react';

/**
 * Single source of truth for "which PermissionKey does this board require," replacing
 * three previously-duplicated, hand-maintained sources that disagreed with each other:
 * AppRoutes.tsx's inline requiredRoles arrays, the dead routeConfig.ts, and MainLayout.tsx's
 * own sidebar-visibility switch. Keys match apps EasyHMSAPI.Api's RequiresPermissionAttribute
 * usage and easyHMSDatabase's seed_global_min.sql exactly -- keep both in sync when adding a
 * board. One key per board (OR semantics if a route ever needs more than one).
 */
export type PermissionKey =
  | 'admin_panel'
  | 'appointment_scheduler'
  | 'appointment_booking'
  | 'billing'
  | 'doc_board'
  | 'ipd'
  | 'nursing_station'
  | 'ot_board'
  | 'icu_board'
  | 'pathology'
  | 'pharmacy'
  | 'inventory'
  | 'patients'
  | 'doctor_calendar'
  | 'abdm'
  | 'leads'
  | 'print_preview';

export interface BoardAccessRule {
  id: string;
  path: string; // route pattern -- ":param" segments match anything
  permissionKeys: PermissionKey[];
  navLabel?: string;
  navIcon?: LucideIcon;
  showInSidebar?: boolean;
  showInMobileNav?: boolean;
}

export const BOARD_ACCESS: BoardAccessRule[] = [
  { id: 'admin', path: '/admin', permissionKeys: ['admin_panel'], navLabel: 'Admin Panel', navIcon: Shield, showInSidebar: true },
  { id: 'configuration', path: '/configuration', permissionKeys: ['admin_panel'] },
  { id: 'settings', path: '/settings', permissionKeys: ['admin_panel'], showInMobileNav: true },
  { id: 'subscription', path: '/subscription', permissionKeys: ['admin_panel'], navLabel: 'Subscription', navIcon: Crown, showInSidebar: true },
  { id: 'chain', path: '/chain', permissionKeys: ['admin_panel'] },
  { id: 'abdm', path: '/abdm', permissionKeys: ['abdm'], navLabel: 'ABHA / ABDM', navIcon: FileBadge2, showInSidebar: true },
  { id: 'leads', path: '/leads', permissionKeys: ['leads'], navLabel: 'Lead Generation', navIcon: Megaphone, showInSidebar: true },
  { id: 'ipd-workspace', path: '/ipd-workspace', permissionKeys: ['ipd'], navLabel: 'IPD', navIcon: Hotel, showInSidebar: true, showInMobileNav: true },
  { id: 'ipd-workspace-patient', path: '/ipd-workspace/patient/:id', permissionKeys: ['ipd'] },
  { id: 'inventory', path: '/inventory', permissionKeys: ['inventory'], navLabel: 'Inventory', navIcon: Boxes, showInSidebar: true },
  { id: 'pathology', path: '/pathology', permissionKeys: ['pathology'], navLabel: 'Pathology Lab', navIcon: FlaskConical, showInSidebar: true },
  { id: 'ot-board', path: '/ot-board', permissionKeys: ['ot_board'], navLabel: 'OT Board', navIcon: ActivityIcon, showInSidebar: true },
  { id: 'icu-board', path: '/icu-board', permissionKeys: ['icu_board'], navLabel: 'ICU Board', navIcon: HeartPulse, showInSidebar: true },
  { id: 'nursing-station', path: '/nursing-station', permissionKeys: ['nursing_station'], navLabel: 'Nursing Station', navIcon: ClipboardList, showInSidebar: true },
  { id: 'dashboard', path: '/dashboard', permissionKeys: ['doc_board'], navLabel: 'Doctor Board', navIcon: LayoutDashboard, showInSidebar: true },
  { id: 'calendar', path: '/calendar', permissionKeys: ['doctor_calendar'] },
  { id: 'appointment-dashboard', path: '/appointment-dashboard', permissionKeys: ['appointment_scheduler'], navLabel: 'Appointments', navIcon: Calendar, showInSidebar: true, showInMobileNav: true },
  { id: 'appointment-booking', path: '/appointment-booking', permissionKeys: ['appointment_booking'] },
  { id: 'appointment-oversight', path: '/appointment-oversight', permissionKeys: ['appointment_scheduler'] },
  { id: 'doc-ai', path: '/doc-ai', permissionKeys: ['doc_board'] },
  { id: 'patients', path: '/patients', permissionKeys: ['patients'], navLabel: 'Patients', navIcon: Users, showInSidebar: true },
  { id: 'patient-detail', path: '/patient/:patientId', permissionKeys: ['patients'] },
  { id: 'patient-new', path: '/patient/new', permissionKeys: ['patients'] },
  { id: 'billing', path: '/billing', permissionKeys: ['billing'], navLabel: 'Billing', navIcon: IndianRupee, showInSidebar: true, showInMobileNav: true },
  { id: 'billing-ledger', path: '/billing/ledger', permissionKeys: ['billing'] },
  { id: 'billing-appointment', path: '/billing/:appointmentId', permissionKeys: ['billing'] },
  { id: 'billing-encounter', path: '/billing/encounter/:encounterId', permissionKeys: ['billing'] },
  { id: 'pharmacy-retail', path: '/pharmacy-retail', permissionKeys: ['pharmacy'], navLabel: 'Pharmacy Retail', navIcon: Pill, showInSidebar: true },
  { id: 'print-preview', path: '/print-preview', permissionKeys: ['print_preview'] },
];

function pathSegmentsMatch(pattern: string, actual: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const actualParts = actual.split('/').filter(Boolean);
  if (patternParts.length !== actualParts.length) return false;
  return patternParts.every((part, i) => part.startsWith(':') || part === actualParts[i]);
}

export function getBoardAccessRule(path: string): BoardAccessRule | undefined {
  return BOARD_ACCESS.find((rule) => pathSegmentsMatch(rule.path, path));
}

export function getRequiredPermissions(path: string): PermissionKey[] | undefined {
  return getBoardAccessRule(path)?.permissionKeys;
}
