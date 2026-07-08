import { supabase } from '@/src/lib/supabase';
import { getPrimaryStallId } from '@/src/services/menu';
import { getKitchenDate, getKitchenTomorrow, formatDateKey } from '@/src/utils/helpers';
import { useQuery } from '@tanstack/react-query';
import { Order } from '@/src/types/models';
import { fetchOrders } from '@/src/services/orders';

export interface DashboardMetrics {
  todayOrders: {
    total: number;
    pending: number;
    accepted: number;
    ready: number;
    collected: number;
  };
  activeSubscribers: number;
  tomorrowReservations: number;
  tomorrowTotalMeals: number;
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

  // 1. Fetch Today's Orders using the shared service
  const todayOrders = await fetchOrders({
    stallId: actualStallId,
    date: formatDateKey(today),
    includeCancelled: false,
  });

  // 2. Fetch Active Subscriptions
  // Assuming a stall_id or just count all active for single-stall operation
  const { count: activeSubCount, error: subError } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (subError) throw subError;

  // 3. Fetch Tomorrow's Reservations
  const tomorrowOrders = await fetchOrders({
    stallId: actualStallId,
    date: formatDateKey(tomorrow),
    includeCancelled: false,
    statusIn: ['pending', 'confirmed', 'preparing', 'ready'],
  });

  let tomorrowTotalMeals = 0;
  for (const order of tomorrowOrders) {
    if (order.items) {
      for (const item of order.items) {
        tomorrowTotalMeals += item.quantity;
      }
    }
  }

  const tomorrowResCount = tomorrowOrders.length;

  // 4. Calculate Metrics
  console.log(`[Dashboard] Received ${todayOrders.length} orders for today.`);
  console.log('[Dashboard] Array:', JSON.stringify(todayOrders.map(o => ({ id: o.id, status: o.status, pickupDate: o.pickupDate })), null, 2));

  let pending = 0, accepted = 0, ready = 0, collected = 0;
  let subscriptionOrders = 0, cashOrders = 0, pendingRequiresAttention = 0;

  const now = new Date().getTime();

  for (const order of todayOrders) {
    if (order.status === 'pending') pending++;
    else if (order.status === 'confirmed' || order.status === 'preparing') accepted++;
    else if (order.status === 'ready') ready++;
    else if (order.status === 'picked_up' || order.status === 'delivered') collected++;

    if (order.orderType === 'subscription') subscriptionOrders++;
    else cashOrders++;

    if (order.status === 'pending') {
      const orderTime = new Date(order.createdAt).getTime();
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
      accepted,
      ready,
      collected,
    },
    activeSubscribers: activeSubCount || 0,
    tomorrowReservations: tomorrowResCount || 0,
    tomorrowTotalMeals: tomorrowTotalMeals,
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

export interface TomorrowReservationDetails {
  totalReservations: number;
  uniqueCustomers: number;
  totalMealsReserved: number;
  mealBreakdown: Record<string, number>;
  customerBreakdown: {
    id: string;
    customerName: string;
    phone: string;
    orderNumber: string;
    reservedMeals: string[]; // List of meal names
    quantity: number;
  }[];
}

export const fetchTomorrowReservationsDetailed = async (stallId?: string): Promise<TomorrowReservationDetails> => {
  const tomorrow = getKitchenTomorrow();
  const actualStallId = stallId || await getPrimaryStallId();

  // Fetch all orders for tomorrow using the shared service
  const orders = await fetchOrders({
    stallId: actualStallId,
    date: formatDateKey(tomorrow),
    includeCancelled: false,
    statusIn: ['pending', 'confirmed', 'preparing', 'ready'],
  });

  let totalMealsReserved = 0;
  const mealBreakdown: Record<string, number> = {};
  const uniqueCustomerSet = new Set<string>();

  const customerBreakdown = orders.map((order) => {
    uniqueCustomerSet.add(order.customerName);
    
    let orderQuantity = 0;
    const reservedMeals: string[] = [];

    for (const item of (order.items || [])) {
      orderQuantity += item.quantity;
      totalMealsReserved += item.quantity;
      mealBreakdown[item.mealName] = (mealBreakdown[item.mealName] || 0) + item.quantity;
      reservedMeals.push(item.mealName);
    }

    return {
      id: order.id,
      customerName: order.customerName,
      phone: order.customerPhone || 'Not Provided',
      orderNumber: order.orderNumber,
      reservedMeals,
      quantity: orderQuantity,
    };
  });

  return {
    totalReservations: orders.length,
    uniqueCustomers: uniqueCustomerSet.size,
    totalMealsReserved,
    mealBreakdown,
    customerBreakdown,
  };
};

export const useTomorrowReservationsDetailed = () => {
  return useQuery({
    queryKey: ['tomorrow_reservations_detailed', formatDateKey(getKitchenTomorrow())],
    queryFn: () => fetchTomorrowReservationsDetailed(),
    refetchInterval: 60000,
  });
};
