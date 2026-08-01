import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import {
  dashboardKeys,
  ordersKeys,
  invalidateCanonicalOperationalQueries,
} from '@/src/constants/queryKeys';
import { getDeviceId } from '@/src/utils/device';
import { useAuthStore } from '@/src/store';

export const useDashboardRealtime = (
  stallId: string | undefined,
  operationsDate: string | null
) => {
  const queryClient = useQueryClient();
  const prevDateRef = useRef<string | null>(operationsDate);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (prevDateRef.current !== operationsDate) {
      console.log(
        '[DASHBOARD DATE SWITCH]',
        JSON.stringify(
          {
            deviceId: getDeviceId(),
            oldDate: prevDateRef.current,
            newDate: operationsDate,
            oldChannelRemoved:
              prevDateRef.current && stallId
                ? `kitchen-dashboard:${stallId}:${prevDateRef.current}`
                : null,
            newChannelCreated:
              operationsDate && stallId
                ? `kitchen-dashboard:${stallId}:${operationsDate}`
                : null,
            queriesInvalidated: true,
          },
          null,
          2
        )
      );

      // Invalidate queries for the old date so no stale cache remains
      if (prevDateRef.current && stallId) {
        invalidateCanonicalOperationalQueries(queryClient, stallId, prevDateRef.current);
      }

      prevDateRef.current = operationsDate;
    }
  }, [operationsDate, stallId, queryClient]);

  useEffect(() => {
    if (!stallId || !operationsDate) return;

    const channelName = `kitchen-dashboard:${stallId}:${operationsDate}`;
    const canonicalKey = dashboardKeys.summary(stallId, operationsDate);

    // 11. ACTIVE STALL CONSISTENCY
    console.log(
      '[KITCHEN SYNC CONTEXT]',
      JSON.stringify(
        {
          deviceId: getDeviceId(),
          userId: user?.id || null,
          stallId,
          operationalDate: operationsDate,
          queryKey: canonicalKey,
          channelName,
        },
        null,
        2
      )
    );

    console.log(
      '[KITCHEN REALTIME CREATED]',
      JSON.stringify(
        {
          deviceId: getDeviceId(),
          channelName,
          stallId,
          operationalDate: operationsDate,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // 5. REGISTER BEFORE SUBSCRIBE
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `stall_id=eq.${stallId}`,
        },
        (payload: any) => {
          const record =
            payload.new && Object.keys(payload.new).length > 0
              ? payload.new
              : payload.old;
          if (payload.eventType === 'INSERT' && record) {
            console.log(
              '[KITCHEN ORDER INSERT]',
              JSON.stringify(
                {
                  orderId: record.id,
                  orderNumber: record.order_number,
                  createdAt: record.created_at,
                  status: record.status,
                  paymentMethod: record.payment_method,
                  paymentStatus: record.payment_status,
                  verificationStatus: record.payment_verification_status || null,
                },
                null,
                2
              )
            );
          }

          if (record && record.pickup_date === operationsDate) {
            console.log('[DASHBOARD REALTIME] Order changed', {
              eventType: payload.eventType,
              table: 'orders',
              orderId: record.id,
              pickupDate: record.pickup_date,
              status: record.status,
              paymentMethod: record.payment_method,
              paymentStatus: record.payment_status,
            });

            // 6. REALTIME EVENT HANDLING -> Invalidate authoritative backend queries
            invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        (payload: any) => {
          console.log('[DASHBOARD REALTIME] Order item changed', {
            eventType: payload.eventType,
            table: 'order_items',
            itemId: (payload.new || payload.old)?.id,
          });

          invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate);
        }
      );

    // Subscribe AFTER registering handlers
    channel.subscribe((status) => {
      console.log(
        '[KITCHEN REALTIME STATUS]',
        JSON.stringify(
          {
            deviceId: getDeviceId(),
            channelName,
            status,
            stallId,
            operationalDate: operationsDate,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      // 9. REALTIME RECONNECT RECOVERY -> full backend refetch on reconnect
      if (status === 'SUBSCRIBED') {
        invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate);
      }
    });

    // 8. APP FOREGROUND -> refetch on returning from background
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('[KITCHEN REALTIME] App active, refetching canonical queries');
        invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate);
      }
    });

    return () => {
      console.log(`[DASHBOARD REALTIME] Unsubscribing from ${channelName}`);
      console.log(
        '[KITCHEN REALTIME REMOVED]',
        JSON.stringify(
          {
            deviceId: getDeviceId(),
            channelName,
            stallId,
            operationalDate: operationsDate,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );
      appStateSub.remove();
      supabase.removeChannel(channel);
    };
  }, [stallId, operationsDate, queryClient, user]);
};
