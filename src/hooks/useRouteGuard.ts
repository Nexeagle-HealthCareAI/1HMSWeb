import { useCallback } from 'react';
import { useIsAuthenticated, useAuthLoading } from '@/store';
import { RoleService } from '@/features/auth/services/roleService';

interface RouteGuardResult {
  hasAccess: boolean;
  isLoading: boolean;
  redirectTo?: string;
  userRole: string | null;
  canAccess: (requiredRoles?: string[], requiredPermissions?: string[]) => boolean;
}

/**
 * Enhanced route guard hook that provides comprehensive access control
 */
export const useRouteGuard = (requiredRoles?: string[], requiredPermissions?: string[]): RouteGuardResult => {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const userRole = RoleService.getRole();

  // Check if user can access based on roles and permissions
  const canAccess = useCallback((roles?: string[], permissions?: string[]) => {
    return RoleService.canAccessRoute(roles, permissions);
  }, []);

  // Check access for the current route
  const checkAccess = useCallback(() => {
    if (isLoading) {
      return { hasAccess: false, isLoading: true };
    }

    if (!isAuthenticated) {
      return { hasAccess: false, redirectTo: '/' };
    }

    // Get userRole inside the function to avoid dependency issues
    const currentUserRole = RoleService.getRole();

    if (requiredRoles && requiredRoles.length > 0) {
      if (!RoleService.hasAnyRole(requiredRoles)) {
        const redirectPath = RoleService.getRedirectPath(currentUserRole);
        return { hasAccess: false, redirectTo: redirectPath };
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!RoleService.hasAllPermissions(requiredPermissions)) {
        const redirectPath = RoleService.getRedirectPath(currentUserRole);
        return { hasAccess: false, redirectTo: redirectPath };
      }
    }

    return { hasAccess: true };
  }, [isAuthenticated, isLoading, requiredRoles, requiredPermissions]);

  // Removed auto-redirect effect to prevent infinite loops
  // Components should handle their own redirects using the returned values

  const accessResult = checkAccess();

  return {
    hasAccess: accessResult.hasAccess,
    isLoading: accessResult.isLoading ?? false,
    redirectTo: accessResult.redirectTo,
    userRole,
    canAccess
  };
};

/**
 * Hook for checking specific permissions
 */
export const usePermissions = () => {
  const userRole = RoleService.getRole();
  const userPermissions = RoleService.getPermissions();

  const hasPermission = useCallback((permission: string) => {
    return RoleService.hasPermission(permission);
  }, []);

  const hasAnyPermission = useCallback((permissions: string[]) => {
    return RoleService.hasAnyPermission(permissions);
  }, []);

  const hasAllPermissions = useCallback((permissions: string[]) => {
    return RoleService.hasAllPermissions(permissions);
  }, []);

  const hasRole = useCallback((role: string) => {
    return RoleService.hasRole(role);
  }, []);

  const hasAnyRole = useCallback((roles: string[]) => {
    return RoleService.hasAnyRole(roles);
  }, []);

  return {
    userRole,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole
  };
};

/**
 * Hook for role-based UI rendering
 */
export const useRoleGuard = (requiredRoles?: string[], requiredPermissions?: string[]) => {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const userRole = RoleService.getRole();

  const canRender = useCallback(() => {
    if (isLoading || !isAuthenticated) {
      return false;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!RoleService.hasAnyRole(requiredRoles)) {
        return false;
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!RoleService.hasAllPermissions(requiredPermissions)) {
        return false;
      }
    }

    return true;
  }, [isAuthenticated, isLoading, requiredRoles, requiredPermissions]);

  return {
    canRender: canRender(),
    isLoading,
    userRole
  };
};
