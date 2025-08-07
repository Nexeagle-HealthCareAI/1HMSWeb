import { useAuthStore } from '@/store/authStore';

export class RoleService {
  private static ROLE_KEY = 'easyHMS_userRole';
  private static USER_PERMISSIONS_KEY = 'easyHMS_userPermissions';

  // Role definitions
  private static ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    RECEPTIONIST: 'receptionist',
    LAB_TECHNICIAN: 'lab_technician',
    PHARMACIST: 'pharmacist',
    PATIENT: 'patient'
  };

  // Permission definitions
  private static PERMISSIONS = {
    // Patient Management
    VIEW_PATIENTS: 'view_patients',
    CREATE_PATIENTS: 'create_patients',
    EDIT_PATIENTS: 'edit_patients',
    DELETE_PATIENTS: 'delete_patients',
    
    // Appointment Management
    VIEW_APPOINTMENTS: 'view_appointments',
    CREATE_APPOINTMENTS: 'create_appointments',
    EDIT_APPOINTMENTS: 'edit_appointments',
    DELETE_APPOINTMENTS: 'delete_appointments',
    
    // Prescription Management
    VIEW_PRESCRIPTIONS: 'view_prescriptions',
    CREATE_PRESCRIPTIONS: 'create_prescriptions',
    EDIT_PRESCRIPTIONS: 'edit_prescriptions',
    DELETE_PRESCRIPTIONS: 'delete_prescriptions',
    
    // Billing Management
    VIEW_BILLS: 'view_bills',
    CREATE_BILLS: 'create_bills',
    EDIT_BILLS: 'edit_bills',
    DELETE_BILLS: 'delete_bills',
    
    // User Management
    VIEW_USERS: 'view_users',
    CREATE_USERS: 'create_users',
    EDIT_USERS: 'edit_users',
    DELETE_USERS: 'delete_users',
    
    // System Management
    VIEW_REPORTS: 'view_reports',
    MANAGE_SETTINGS: 'manage_settings',
    MANAGE_ROLES: 'manage_roles'
  };

  // Role-Permission mapping
  private static ROLE_PERMISSIONS = {
    [this.ROLES.ADMIN]: [
      this.PERMISSIONS.VIEW_PATIENTS,
      this.PERMISSIONS.CREATE_PATIENTS,
      this.PERMISSIONS.EDIT_PATIENTS,
      this.PERMISSIONS.DELETE_PATIENTS,
      this.PERMISSIONS.VIEW_APPOINTMENTS,
      this.PERMISSIONS.CREATE_APPOINTMENTS,
      this.PERMISSIONS.EDIT_APPOINTMENTS,
      this.PERMISSIONS.DELETE_APPOINTMENTS,
      this.PERMISSIONS.VIEW_PRESCRIPTIONS,
      this.PERMISSIONS.CREATE_PRESCRIPTIONS,
      this.PERMISSIONS.EDIT_PRESCRIPTIONS,
      this.PERMISSIONS.DELETE_PRESCRIPTIONS,
      this.PERMISSIONS.VIEW_BILLS,
      this.PERMISSIONS.CREATE_BILLS,
      this.PERMISSIONS.EDIT_BILLS,
      this.PERMISSIONS.DELETE_BILLS,
      this.PERMISSIONS.VIEW_USERS,
      this.PERMISSIONS.CREATE_USERS,
      this.PERMISSIONS.EDIT_USERS,
      this.PERMISSIONS.DELETE_USERS,
      this.PERMISSIONS.VIEW_REPORTS,
      this.PERMISSIONS.MANAGE_SETTINGS,
      this.PERMISSIONS.MANAGE_ROLES
    ],
    [this.ROLES.DOCTOR]: [
      this.PERMISSIONS.VIEW_PATIENTS,
      this.PERMISSIONS.CREATE_PATIENTS,
      this.PERMISSIONS.EDIT_PATIENTS,
      this.PERMISSIONS.VIEW_APPOINTMENTS,
      this.PERMISSIONS.CREATE_APPOINTMENTS,
      this.PERMISSIONS.EDIT_APPOINTMENTS,
      this.PERMISSIONS.VIEW_PRESCRIPTIONS,
      this.PERMISSIONS.CREATE_PRESCRIPTIONS,
      this.PERMISSIONS.EDIT_PRESCRIPTIONS,
      this.PERMISSIONS.VIEW_BILLS,
      this.PERMISSIONS.VIEW_REPORTS
    ],
    [this.ROLES.NURSE]: [
      this.PERMISSIONS.VIEW_PATIENTS,
      this.PERMISSIONS.EDIT_PATIENTS,
      this.PERMISSIONS.VIEW_APPOINTMENTS,
      this.PERMISSIONS.EDIT_APPOINTMENTS,
      this.PERMISSIONS.VIEW_PRESCRIPTIONS
    ],
    [this.ROLES.RECEPTIONIST]: [
      this.PERMISSIONS.VIEW_PATIENTS,
      this.PERMISSIONS.CREATE_PATIENTS,
      this.PERMISSIONS.EDIT_PATIENTS,
      this.PERMISSIONS.VIEW_APPOINTMENTS,
      this.PERMISSIONS.CREATE_APPOINTMENTS,
      this.PERMISSIONS.EDIT_APPOINTMENTS,
      this.PERMISSIONS.VIEW_BILLS,
      this.PERMISSIONS.CREATE_BILLS,
      this.PERMISSIONS.EDIT_BILLS
    ],
    [this.ROLES.LAB_TECHNICIAN]: [
      this.PERMISSIONS.VIEW_PATIENTS,
      this.PERMISSIONS.VIEW_APPOINTMENTS,
      this.PERMISSIONS.VIEW_PRESCRIPTIONS
    ],
    [this.ROLES.PHARMACIST]: [
      this.PERMISSIONS.VIEW_PATIENTS,
      this.PERMISSIONS.VIEW_PRESCRIPTIONS,
      this.PERMISSIONS.VIEW_BILLS,
      this.PERMISSIONS.CREATE_BILLS,
      this.PERMISSIONS.EDIT_BILLS
    ],
    [this.ROLES.PATIENT]: [
      this.PERMISSIONS.VIEW_PATIENTS,
      this.PERMISSIONS.VIEW_APPOINTMENTS,
      this.PERMISSIONS.VIEW_PRESCRIPTIONS,
      this.PERMISSIONS.VIEW_BILLS
    ]
  };

  // Set user role
  static setRole(role: string): void {
    const authStore = useAuthStore.getState();
    authStore.setUserRole(role);
  }

  // Get user role
  static getRole(): string | null {
    const authStore = useAuthStore.getState();
    return authStore.getUserRole();
  }

  // Check if user has a specific role
  static hasRole(role: string): boolean {
    const currentRole = this.getRole();
    return currentRole === role;
  }

  // Check if user has any of the specified roles
  static hasAnyRole(roles: string[]): boolean {
    const currentRole = this.getRole();
    return roles.includes(currentRole || '');
  }

  // Get permissions for a role
  static getRolePermissions(role: string): string[] {
    return this.ROLE_PERMISSIONS[role] || [];
  }

  // Set user permissions
  static setUserPermissions(permissions: string[]): void {
    const authStore = useAuthStore.getState();
    // Store permissions in the user object
    if (authStore.user) {
      //authStore.updateUser({ permissions });
    }
  }

  // Get user permissions
  static getUserPermissions(): string[] {
    const authStore = useAuthStore.getState();
    return authStore.user?.permissions || [];
  }

  // Check if user has a specific permission
  static hasPermission(permission: string): boolean {
    const userPermissions = this.getUserPermissions();
    const userRole = this.getRole();
    
    if (!userRole) return false;
    
    // Check if permission is in user's direct permissions
    if (userPermissions.includes(permission)) {
      return true;
    }
    
    // Check if permission is in role's permissions
    const rolePermissions = this.getRolePermissions(userRole);
    return rolePermissions.includes(permission);
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

  // Get all available permissions
  static getAvailablePermissions(): string[] {
    return Object.values(this.PERMISSIONS);
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
      [this.ROLES.PATIENT]: 'Patient'
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

  // Get redirect path based on user role
  static getRedirectPath(userRole: string | null): string {
    if (!userRole) return '/';

    const roleRedirects: { [key: string]: string } = {
      [this.ROLES.ADMIN]: '/admin/dashboard',
      [this.ROLES.DOCTOR]: '/doctor/dashboard',
      [this.ROLES.NURSE]: '/nurse/dashboard',
      [this.ROLES.RECEPTIONIST]: '/receptionist/dashboard',
      [this.ROLES.LAB_TECHNICIAN]: '/lab/dashboard',
      [this.ROLES.PHARMACIST]: '/pharmacy/dashboard',
      [this.ROLES.PATIENT]: '/patient/dashboard'
    };

    return roleRedirects[userRole] || '/';
  }

  // Get permissions (alias for getUserPermissions for backward compatibility)
  static getPermissions(): string[] {
    return this.getUserPermissions();
  }
}
