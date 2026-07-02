import { supabase } from '@/src/lib/supabase';
import { getPrimaryStallId } from '@/src/services/menu';
import { getKitchenDate, getKitchenTomorrow, formatDateKey } from '@/src/utils/helpers';
import { useQuery } from '@tanstack/react-query';
import { Order } from '@/src/types/models';

export interface DashboardMetrics {
  todayOrders: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    collected: number;
  };
  activeSubscribers: number;
  tomorrowReservations: number;
  insights: {
    mostOrderedMeal: string | null;
    subscriptionOrders: number;
    cashOrders: number;
    pendingRequiresAttention: number; // Pending for > 15 mins
  };
}

export const fetchDashboardMetrics = async (stallId?: string): Promise<DashboardMetrics> => {
  const today = getKitchenDate();
  const tomorrow = getKitchenTomorrow();
  const actualStallId = stallId || await getPrimaryStallId();

  // 1. Fetch Today's Orders
  const { data: todayOrdersData, error: todayError } = await supabase
    .from('orders')
    .select('id, status, order_type, created_at')
    .eq('stall_id', actualStallId)
    .eq('pickup_date', formatDateKey(today));

  if (todayError) throw todayError;

  // 2. Fetch Active Subscriptions
  // Assuming a stall_id or just count all active for single-stall operation
  const { count: activeSubCount, error: subError } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (subError) throw subError;

  // 3. Fetch Tomorrow's Reservations
  const { count: tomorrowResCount, error: tomorrowError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('stall_id', actualStallId)
    .eq('pickup_date', formatDateKey(tomorrow));

  if (tomorrowError) throw tomorrowError;

  // 4. Calculate Metrics
  const todayOrders = todayOrdersData || [];
  
  let pending = 0, preparing = 0, ready = 0, collected = 0;
  let subscriptionOrders = 0, cashOrders = 0, pendingRequiresAttention = 0;

  const now = new Date().getTime();

  for (const order of todayOrders) {
    if (order.status === 'pending') pending++;
    else if (order.status === 'preparing') preparing++;
    else if (order.status === 'ready') ready++;
    else if (order.status === 'picked_up') collected++;

    if (order.order_type === 'subscription') subscriptionOrders++;
    else cashOrders++;

    if (order.status === 'pending') {
      const orderTime = new Date(order.created_at).getTime();
      const diffMins = (now - orderTime) / (1000 * 60);
      if (diffMins > 15) {
        pendingRequiresAttention++;
      }
    }
  }

  // 5. Most Ordered Meal
  // Need to join order_items for today's orders
  const { data: orderItemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('meal_name, quantity, orders!inner(id, pickup_date, stall_id)')
    .eq('orders.stall_id', actualStallId)
    .eq('orders.pickup_date', formatDateKey(today));

  let mostOrderedMeal = null;
  if (!itemsError && orderItemsData) {
    const mealCounts: Record<string, number> = {};
    for (const item of orderItemsData) {
      mealCounts[item.meal_name] = (mealCounts[item.meal_name] || 0) + item.quantity;
    }
    
    let max = 0;
    for (const [mealName, qty] of Object.entries(mealCounts)) {
      if (qty > max) {
        max = qty;
        mostOrderedMeal = mealName;
      }
    }
  }

  return {
    todayOrders: {
      total: todayOrders.length,
      pending,
      preparing,
      ready,
      collected,
    },
    activeSubscribers: activeSubCount || 0,
    tomorrowReservations: tomorrowResCount || 0,
    insights: {
      mostOrderedMeal,
      subscriptionOrders,
      cashOrders,
      pendingRequiresAttention,
    }
  };
};

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard_metrics', formatDateKey(getKitchenDate())],
    queryFn: () => {
      return fetchDashboardMetrics();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for live feel
  });
};
