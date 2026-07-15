import { supabase } from '@/src/lib/supabase';
import { getPrimaryStallId } from '@/src/services/menu';
import { getOperationalContext, formatDateKey } from '@/src/utils/helpers';
import { useQuery } from '@tanstack/react-query';
import { Order, KitchenHoliday } from '@/src/types/models';
import { fetchOrders } from '@/src/services/orders';
import { getHolidayForDate } from '@/src/services/holidays';

export interface DashboardMetrics {
  executionOrders: {
    total: number;
    pending: number;
    accepted: number;
    ready: number;
    collected: number;
  };
  activeSubscribers: number;
  operationalReservations: number;
  operationalTotalMeals: number;
  insights: {
    mostOrderedMeal: string | null;
    subscriptionOrders: number;
    cashOrders: number;
    pendingRequiresAttention: number; // Pending for > 15 mins
  };
  holidayExecution: KitchenHoliday | null;
  holidayOperational: KitchenHoliday | null;
}

export const fetchDashboardMetrics = async (
  calendarDate: string,
  resolvedOperationalDate: string,
  stallId?: string
): Promise<DashboardMetrics> => {
  const actualStallId = stallId || await getPrimaryStallId();

  // 1. Fetch Execution Orders & Holidays
  const [executionOrdersList, holidayExecution, holidayOperational] = await Promise.all([
    fetchOrders({
      stallId: actualStallId,
      date: calendarDate, // replaced executionDate
      includeCancelled: false,
    }),
    getHolidayForDate(calendarDate, actualStallId),
    getHolidayForDate(resolvedOperationalDate, actualStallId)
  ]);

  // 2. Fetch Active Subscriptions
  // Assuming a stall_id or just count all active for single-stall operation
  const { count: activeSubCount, error: subError } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (subError) throw subError;

  // 3. Fetch Operational Reservations
  const operationalOrders = await fetchOrders({
    stallId: actualStallId,
    date: resolvedOperationalDate,
    includeCancelled: false,
    statusIn: ['pending', 'confirmed', 'preparing', 'ready'],
  });

  let operationalTotalMeals = 0;
  for (const order of operationalOrders) {
    if (order.items) {
      for (const item of order.items) {
        operationalTotalMeals += item.quantity;
      }
    }
  }

  const operationalResCount = operationalOrders.length;

  // 4. Calculate Metrics
  console.log(`[Dashboard] Received ${executionOrdersList.length} execution orders.`);
  console.log('[Dashboard] Array:', JSON.stringify(executionOrdersList.map(o => ({ id: o.id, status: o.status, pickupDate: o.pickupDate })), null, 2));

  let pending = 0, accepted = 0, ready = 0, collected = 0;
  let subscriptionOrders = 0, cashOrders = 0, pendingRequiresAttention = 0;

  const now = new Date().getTime();

  for (const order of executionOrdersList) {
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
  // Need to join order_items for execution orders
  const { data: orderItemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('meal_name, quantity, orders!inner(id, pickup_date, stall_id)')
    .eq('orders.stall_id', actualStallId)
    .eq('orders.pickup_date', calendarDate);

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
    executionOrders: {
      total: executionOrdersList.length,
      pending,
      accepted,
      ready,
      collected,
    },
    activeSubscribers: activeSubCount || 0,
    operationalReservations: operationalResCount || 0,
    operationalTotalMeals: operationalTotalMeals,
    insights: {
      mostOrderedMeal,
      subscriptionOrders,
      cashOrders,
      pendingRequiresAttention,
    },
    holidayExecution,
    holidayOperational,
  };
};

export const useDashboardMetrics = (calendarDate: string, resolvedOperationalDate: string, isResolving: boolean) => {
  return useQuery({
    queryKey: ['dashboard_metrics', calendarDate, resolvedOperationalDate],
    queryFn: () => {
      return fetchDashboardMetrics(calendarDate, resolvedOperationalDate);
    },
    enabled: !isResolving,
    refetchInterval: 30000, // Refresh every 30 seconds for live feel
  });
};

export interface OperationalReservationDetails {
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
    expectedPickupSlot?: string;
  }[];
  holidayOperational: KitchenHoliday | null;
}

export const fetchOperationalReservationsDetailed = async (
  resolvedOperationalDate: string,
  stallId?: string
): Promise<OperationalReservationDetails> => {
  const actualStallId = stallId || await getPrimaryStallId();

  // Fetch all orders for operational date & check holiday
  const [orders, holidayOperational] = await Promise.all([
    fetchOrders({
      stallId: actualStallId,
      date: resolvedOperationalDate,
      includeCancelled: false,
      statusIn: ['pending', 'confirmed', 'preparing', 'ready'],
    }),
    getHolidayForDate(resolvedOperationalDate, actualStallId)
  ]);

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
      expectedPickupSlot: order.expectedPickupSlot,
    };
  });

  return {
    totalReservations: orders.length,
    uniqueCustomers: uniqueCustomerSet.size,
    totalMealsReserved,
    mealBreakdown,
    customerBreakdown,
    holidayOperational,
  };
};

export const useOperationalReservationsDetailed = (resolvedOperationalDate: string, isResolving: boolean) => {
  return useQuery({
    queryKey: ['operational_reservations_detailed', resolvedOperationalDate],
    queryFn: () => fetchOperationalReservationsDetailed(resolvedOperationalDate),
    enabled: !isResolving,
    refetchInterval: 60000,
  });
};
