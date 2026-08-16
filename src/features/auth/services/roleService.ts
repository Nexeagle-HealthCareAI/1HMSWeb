import { useAuthStore } from '@/store/authStore';

export class RoleService {
  private static ROLE_KEY = 'userRole';
  private static USER_PERMISSIONS_KEY = 'userPermissions';

  // Role definitions
  private static ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    RECEPTIONIST: 'receptionist',
    LAB_TECHNICIAN: 'lab_technician',
    PHARMACIST: 'pharmacist',
    PATIENT: 'patient',
    ACCOUNTANT: 'accountant'
  };

  // Set user role (kept for backward compatibility, sets single role)
  static setRole(role: string): void {
    const authStore = useAuthStore.getState();
    authStore.setUserRole(role);
  }

  // Set multiple roles
  static setRoles(roles: string[]): void {
    const authStore = useAuthStore.getState();
    if (authStore.setUserRoles) {
      authStore.setUserRoles(roles);
    } else {
      // Fallback if auth store doesn't have setUserRoles yet
      authStore.setUserRole(roles[0] || null);
    }
  }

  // Get first user role (backward compatibility)
  static getRole(): string | null {
    const roles = this.getRoles();
    return roles.length > 0 ? roles[0] : null;
  }

  // Get all user roles
  static getRoles(): string[] {
    const authStore = useAuthStore.getState();
    if (authStore.getUserRoles) {
      return authStore.getUserRoles();
    }
    const single = authStore.getUserRole();
    return single ? [single] : [];
  }

  // Check if user has a specific role
  static hasRole(role: string): boolean {
    const roles = this.getRoles();
    // Normalize casing for checks
    return roles.some(r => r.toLowerCase() === role.toLowerCase());
  }

  // Check if user has any of the specified roles
  static hasAnyRole(roles: string[]): boolean {
    const currentRoles = this.getRoles().map(r => r.toLowerCase());
    const targetRoles = roles.map(r => r.toLowerCase());
    return targetRoles.some(r => currentRoles.includes(r));
  }

  // Set user permissions
  static setUserPermissions(permissions: string[]): void {
    const authStore = useAuthStore.getState();
    // Store permissions in the user object
    if (authStore.user) {
      //authStore.updateUser({ permissions });
    }
  }

  // Get user permissions. Reads authStore's real, correctly-populated `permissions` field
  // (set by fetchAndStoreUserPermissions() from GET /user/permissions) -- this used to read
  // authStore.user?.permissions, a different field the login flow never populates, which
  // silently made every permission check return false regardless of the caller's real
  // backend-granted permissions.
  static getUserPermissions(): string[] {
    const authStore = useAuthStore.getState();
    return authStore.getPermissions();
  }

  // Check if user has a specific permission (real backend-granted PermissionKey, e.g. "ipd")
  static hasPermission(permission: string): boolean {
    if (this.getRoles().length === 0) return false;
    return this.getUserPermissions().includes(permission);
  }

  // Check if user has all specified permissions
  static hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  // Check if user has any of the specified permissions
  static hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  // Clear role and permissions
  static clearRoleAndPermissions(): void {
    const authStore = useAuthStore.getState();
    authStore.setUserRole(null);
    if (authStore.user) {
     // authStore.updateUser({ permissions: [] });
    }
  }

  // Get all available roles
  static getAvailableRoles(): string[] {
    return Object.values(this.ROLES);
  }

  // Get role display name
  static getRoleDisplayName(role: string): string {
    const displayNames: { [key: string]: string } = {
      [this.ROLES.ADMIN]: 'Administrator',
      [this.ROLES.DOCTOR]: 'Doctor',
      [this.ROLES.NURSE]: 'Nurse',
      [this.ROLES.RECEPTIONIST]: 'Receptionist',
      [this.ROLES.LAB_TECHNICIAN]: 'Lab Technician',
      [this.ROLES.PHARMACIST]: 'Pharmacist',
      [this.ROLES.PATIENT]: 'Patient',
      [this.ROLES.ACCOUNTANT]: 'Accountant'
    };
    return displayNames[role] || role;
  }

  // Check if user can access a route based on roles and permissions
  static canAccessRoute(requiredRoles?: string[], requiredPermissions?: string[]): boolean {
    if (requiredRoles && requiredRoles.length > 0) {
      if (!this.hasAnyRole(requiredRoles)) {
        return false;
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!this.hasAllPermissions(requiredPermissions)) {
        return false;
      }
    }

    return true;
  }

  // Get redirect path based on user role. Keyed on the real PascalCase role strings the
  // backend/auth store actually use (e.g. "Accountant") and real existing routes from
  // AppRoutes.tsx — the previous version keyed on this.ROLES' lowercase constants (e.g.
  // "accountant") against fictional paths like "/nurse/dashboard" that don't exist as routes,
  // so this always fell through to "/" for every role: a real role landing on a route their
  // RouteGuard denies would get silently bounced to "/" instead of somewhere that actually works.
  static getRedirectPath(userRole: string | null): string {
    if (!userRole) return '/';

    const roleRedirects: { [key: string]: string } = {
      Admin: '/admin',
      AdminDoctor: '/admin',
      Doctor: '/dashboard',
      Nurse: '/appointment-dashboard',
      Receptionist: '/appointment-dashboard',
      Accountant: '/billing',
    };

    return roleRedirects[userRole] || '/';
  }

  // Get permissions (alias for getUserPermissions for backward compatibility)
  static getPermissions(): string[] {
    return this.getUserPermissions();
  }
}
