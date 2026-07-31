import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { dashboardKeys, ordersKeys } from '@/src/constants/queryKeys';

export const useDashboardRealtime = (stallId: string | undefined, operationsDate: string | null) => {
  const queryClient = useQueryClient();
  const prevDateRef = useRef<string | null>(operationsDate);

  useEffect(() => {
    if (prevDateRef.current !== operationsDate) {
      console.log('[DASHBOARD DATE SWITCH]', JSON.stringify({
        oldDate: prevDateRef.current,
        newDate: operationsDate,
        oldChannelRemoved: prevDateRef.current && stallId ? `kitchen-dashboard:${stallId}:${prevDateRef.current}` : null,
        newChannelCreated: operationsDate && stallId ? `kitchen-dashboard:${stallId}:${operationsDate}` : null,
        queriesInvalidated: true,
      }, null, 2));

      // Invalidate queries for the old date so no stale cache remains
      if (prevDateRef.current && stallId) {
        queryClient.invalidateQueries({ queryKey: ['dashboard_summary', stallId] });
        queryClient.invalidateQueries({ queryKey: ['orders', 'list', stallId] });
      }

      prevDateRef.current = operationsDate;
    }
  }, [operationsDate, stallId, queryClient]);

  useEffect(() => {
    if (!stallId || !operationsDate) return;

    const channelName = `kitchen-dashboard:${stallId}:${operationsDate}`;
    const channel = supabase.channel(channelName);

    // Subscribe to Orders
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `stall_id=eq.${stallId}`,
        },
        (payload: any) => {
          const record = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old;
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

            queryClient.invalidateQueries({ queryKey: ['dashboard_summary', stallId] });
            queryClient.invalidateQueries({ queryKey: ordersKeys.list(stallId, operationsDate) });
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

          queryClient.invalidateQueries({ queryKey: ['dashboard_summary', stallId] });
        }
      );

    channel.subscribe((status) => {
      console.log(`[DASHBOARD REALTIME] Channel ${channelName} status:`, status);
    });

    return () => {
      console.log(`[DASHBOARD REALTIME] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [stallId, operationsDate, queryClient]);
};
