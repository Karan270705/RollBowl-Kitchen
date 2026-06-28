import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { UserRole } from '@/src/constants/enums';
import { useRoleGuard } from '@/src/hooks/useRoleGuard';

/**
 * Entry point — auth + role redirect.
 * No UI rendered. Splash screen stays visible until navigation occurs.
 *
 * Flow:
 *  1. Still loading → do nothing (splash stays)
 *  2. Not authenticated → go to login
 *  3. Authenticated but role = customer → go to access-denied
 *  4. Authenticated with kitchen/stall_operator → go to dashboard
 */
export default function EntryRedirect() {
  const router = useRouter();
  const { canAccess, isDenied, isLoading } = useRoleGuard([
    UserRole.KITCHEN,
    UserRole.STALL_OPERATOR,
  ]);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (isDenied) {
        router.replace('/access-denied' as any);
      } else if (canAccess) {
        router.replace('/(app)/(dashboard)' as any);
      } else {
        router.replace('/(auth)/login' as any);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [canAccess, isDenied, isLoading]);

  return null;
}
