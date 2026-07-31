import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { dashboardKeys, ordersKeys } from '@/src/constants/queryKeys';

export const useDashboardRealtime = (stallId: string | undefined, operationsDate: string) => {
  const queryClient = useQueryClient();

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
          // Check pickup_date from either new or old record
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

            // Invalidate keys that depend on operationsDate
            queryClient.invalidateQueries({ queryKey: dashboardKeys.summary(stallId, operationsDate) });
            queryClient.invalidateQueries({ queryKey: dashboardKeys.mostOrdered(stallId, operationsDate) });
            queryClient.invalidateQueries({ queryKey: dashboardKeys.paymentBreakdown(stallId, operationsDate) });
            queryClient.invalidateQueries({ queryKey: ordersKeys.list(stallId, operationsDate) });
          }
        }
      )
      // Subscribe to Order Items
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

          // Conservatively invalidate since order_items doesn't have pickup_date directly
          queryClient.invalidateQueries({ queryKey: dashboardKeys.mostOrdered(stallId, operationsDate) });
          queryClient.invalidateQueries({ queryKey: dashboardKeys.summary(stallId, operationsDate) });
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
