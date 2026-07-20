import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRouteGuard, usePermissions } from '@/hooks/useRouteGuard';
import { useIsAuthenticated, useAuthLoading, useHasRole, useHasPermission, useHasAnyRole, useHasAllPermissions } from '@/store';
import { RoleService } from '@/features/auth/services/roleService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallbackComponent?: React.ComponentType;
  redirectTo?: string;
  showLoading?: boolean;
}

/**
 * RouteGuard component for protecting routes based on roles and permissions
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
  fallbackComponent: FallbackComponent,
  redirectTo,
  showLoading = true
}) => {
  const { hasAccess, isLoading, redirectTo: autoRedirect } = useRouteGuard(requiredRoles, requiredPermissions);
  console.log('[LOGIN-DEBUG] RouteGuard: path=', window.location.pathname, 'requiredRoles=', requiredRoles, 'hasAccess=', hasAccess, 'isLoading=', isLoading, 'autoRedirect=', autoRedirect);

  // Show loading spinner while checking authentication
  if (isLoading && showLoading) {
    console.log('[LOGIN-DEBUG] RouteGuard: showing LoadingSpinner (isLoading=true)');
    return <LoadingSpinner />;
  }

  // If access is denied
  if (!hasAccess) {
    // Show custom fallback component if provided
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    // Redirect to specified path or auto-determined path
    const targetPath = redirectTo || autoRedirect || '/';
    console.log('[LOGIN-DEBUG] RouteGuard: ACCESS DENIED, redirecting to', targetPath);
    return <Navigate to={targetPath} replace />;
  }

  // Render children if access is granted
  return <>{children}</>;
};

/**
 * PermissionGuard component for protecting UI elements based on permissions
 */
interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: string[];
  fallbackComponent?: React.ComponentType;
  requireAll?: boolean; // true = all permissions required, false = any permission required
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermissions,
  fallbackComponent: FallbackComponent,
  requireAll = true
}) => {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();

  const hasAccess = requireAll 
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  if (!hasAccess) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return null; // Don't render anything if no fallback
  }

  return <>{children}</>;
};

/**
 * RoleGuard component for protecting UI elements based on roles
 */
interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles: string[];
  fallbackComponent?: React.ComponentType;
  requireAll?: boolean; // true = all roles required, false = any role required
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRoles,
  fallbackComponent: FallbackComponent,
  requireAll = false
}) => {
  const { canAccess } = useRouteGuard();

  const hasAccess = canAccess(requiredRoles);

  if (!hasAccess) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return null; // Don't render anything if no fallback
  }

  return <>{children}</>;
};

/**
 * AuthGuard component for protecting routes that require authentication
 */
interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  showLoading?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  redirectTo = '/',
  showLoading = true
}) => {
  const { hasAccess, isLoading } = useRouteGuard();

  if (isLoading && showLoading) {
    return <LoadingSpinner />;
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

/**
 * PublicGuard component for protecting routes that should only be accessible when NOT authenticated
 */
interface PublicGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const PublicGuard: React.FC<PublicGuardProps> = ({
  children,
  redirectTo
}) => {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If user is authenticated, redirect to appropriate dashboard
  if (isAuthenticated) {
    const userRole = RoleService.getRole();
    const targetPath = redirectTo || (userRole === 'Admin' ? '/admin' : '/dashboard');
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};
