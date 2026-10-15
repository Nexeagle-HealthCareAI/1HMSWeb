import { BOARD_ACCESS, getBoardAccessRule } from '@/config/boardAccess';
import type { VitaScreenContext, VitaScreenLink } from './api/vitaClient';

/**
 * What Vita is told about the current page: the board and its route PATTERN
 * ("/patient/:patientId"), never the real path. Record ids such as a patient id must not leave
 * the browser in a question's context.
 */
export function screenContext(pathname: string): VitaScreenContext | null {
  const rule = getBoardAccessRule(pathname);
  if (!rule) return null;
  return { route: rule.path, screenId: rule.id };
}

/**
 * A screen Vita suggests may be opened only if it is a real 1HMS board without parameters and
 * this user holds one of its permission keys. Vita checks this too; the browser re-checks so a
 * bad or stale suggestion can never send someone to a page they cannot use.
 */
export function canOpen(link: VitaScreenLink, permissions: readonly string[]): boolean {
  if (!link.route.startsWith('/') || link.route.includes(':')) return false;
  const rule = BOARD_ACCESS.find((r) => r.path === link.route);
  if (!rule) return false;
  return rule.permissionKeys.some((k) => permissions.includes(k));
}
