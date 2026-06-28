import { useAuthStore } from '@/src/store';
import { UserRole } from '@/src/constants/enums';

interface RoleGuardResult {
  /** User has an allowed role and can access the app */
  canAccess: boolean;
  /** User is authenticated but has a forbidden role */
  isDenied: boolean;
  /** Auth state is still initializing */
  isLoading: boolean;
}

/**
 * Role-based access control hook.
 * Used by the entry redirect to gate access to the Kitchen App.
 *
 * @param allowedRoles - Array of UserRole values that are allowed access.
 * @returns Object with canAccess, isDenied, and isLoading flags.
 */
export function useRoleGuard(allowedRoles: UserRole[]): RoleGuardResult {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) {
    return { canAccess: false, isDenied: false, isLoading: true };
  }

  if (!isAuthenticated || !user) {
    return { canAccess: false, isDenied: false, isLoading: false };
  }

  if (!allowedRoles.includes(user.role)) {
    return { canAccess: false, isDenied: true, isLoading: false };
  }

  return { canAccess: true, isDenied: false, isLoading: false };
}
