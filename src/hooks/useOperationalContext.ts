import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  resolveSharedOperationalDate,
  OperationalContextResult,
  DEFAULT_RESOLVING_CONTEXT,
} from '../utils/operationalDate';
import { invalidateCanonicalOperationalQueries } from '../constants/queryKeys';
import { useCurrentStallId } from '../contexts/StallContext';

export function useOperationalContext(): OperationalContextResult & { stallId: string; refetch: () => void } {
  const stallId = useCurrentStallId(); // Get stallId from context
  const queryClient = useQueryClient();
  const rolloverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['operational-context', stallId],
    queryFn: () => resolveSharedOperationalDate(stallId),
    enabled: !!stallId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  const scheduleNextBoundary = useCallback(() => {
    if (rolloverTimerRef.current) {
      clearTimeout(rolloverTimerRef.current);
      rolloverTimerRef.current = null;
    }

    if (!data) return;

    let delayMs = 1000 * 60 * 5; // Default 5 minute retry if no explicit boundary
    let targetIST = 'unknown';

    if (data.activeMenuDeliveryEndMs) {
      delayMs = data.activeMenuDeliveryEndMs - Date.now();
      targetIST = new Date(data.activeMenuDeliveryEndMs).toISOString();
    }

    // Minimum safety guard
    if (!Number.isFinite(delayMs) || delayMs < 1000) {
      console.warn('[ROLLOVER TIMER SAFETY GUARD] delayMs < 1000, forcing 5 minute retry boundary', { delayMs });
      delayMs = 1000 * 60 * 5;
    }

    console.log('[ROLLOVER TIMER SCHEDULE]', JSON.stringify({
      nowISO: new Date().toISOString(),
      nowIST: new Date(Date.now() + 19800000).toISOString().replace('Z', '+05:30'),
      targetIST,
      delayMs,
      existingTimerPresent: !!rolloverTimerRef.current,
    }, null, 2));

    rolloverTimerRef.current = setTimeout(() => {
      console.log('[OPERATIONAL ROLLOVER] Timeout reached, refetching context...');
      rolloverTimerRef.current = null;
      refetchRef.current?.();
      if (stallId) {
        invalidateCanonicalOperationalQueries(queryClient, stallId);
      }
      // Re-schedule will happen inside useEffect when `data` updates
    }, delayMs);
  }, [data, stallId, queryClient]);

  useEffect(() => {
    scheduleNextBoundary();
    return () => {
      if (rolloverTimerRef.current) {
        clearTimeout(rolloverTimerRef.current);
        rolloverTimerRef.current = null;
      }
    };
  }, [scheduleNextBoundary]);

  // Recompute on AppState foreground exactly once per transition
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[OPERATIONAL ROLLOVER] App foregrounded, refetching context...');
        if (rolloverTimerRef.current) {
          clearTimeout(rolloverTimerRef.current);
          rolloverTimerRef.current = null;
        }
        refetchRef.current?.();
        if (stallId) {
          invalidateCanonicalOperationalQueries(queryClient, stallId);
        }
        scheduleNextBoundary();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [scheduleNextBoundary, stallId, queryClient]);

  return {
    ...(data ?? DEFAULT_RESOLVING_CONTEXT),
    stallId: stallId,
    refetch: () => {
      refetchRef.current?.();
      scheduleNextBoundary();
    },
  };
}
