import { supabase } from '@/src/lib/supabase';

import { useQuery } from '@tanstack/react-query';
import { Order, KitchenHoliday } from '@/src/types/models';
import { fetchOrders } from '@/src/services/orders';
import { fetchWalkInSales } from '@/src/services/inventory';
import { getHolidayForDate } from '@/src/services/holidays';
import { dashboardKeys } from '@/src/constants/queryKeys';
import { getTodayISTDateString } from '@/src/utils/operationalDate';

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
    walkInSales: number;
    walkInRevenue: number;
    pendingRequiresAttention: number; // Pending for > 15 mins
  };
  sourceOrderIds: string[];
  lastBackendFetchAt: string;
  holidayExecution: KitchenHoliday | null;
  holidayOperational: KitchenHoliday | null;
}

export const fetchDashboardMetrics = async (
  stallId: string,
  calendarDate: string,
  resolvedOperationalDate: string | null,
  preparationDate: string
): Promise<DashboardMetrics> => {
  const operationsDate = resolvedOperationalDate;

  // 1. Fetch Execution Orders (Operations dataset), Walk-in Sales & Holidays
  const [executionOrdersList, walkInSalesList, holidayExecution, holidayOperational] = await Promise.all([
    operationsDate
      ? fetchOrders({
          stallId: stallId,
          date: operationsDate,
          includeCancelled: true,
        })
      : Promise.resolve([] as Order[]),
    fetchWalkInSales(stallId, calendarDate),
    operationsDate
      ? getHolidayForDate(operationsDate, stallId)
      : Promise.resolve(null),
    getHolidayForDate(preparationDate, stallId)
  ]);

  // 2. Fetch Active Subscriptions (stall-scoped)
  const { count: activeSubCount, error: subError } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('stall_id', stallId)
    .eq('status', 'active')
    .lte('start_date', getTodayISTDateString())
    .gte('end_date', getTodayISTDateString());

  if (subError) throw subError;

  // 3. Operational Reservations (bound to preparationDate)
  const operationalOrders = await fetchOrders({
    stallId: stallId,
    date: preparationDate,
    includeCancelled: false,
    statusIn: ['pending', 'confirmed', 'preparing', 'ready'],
  });

  let operationalTotalMeals = 0;
  let operationalResCount = 0;

  for (const order of operationalOrders) {
    if (order.status !== 'cancelled') {
      operationalResCount++;
      if (order.items) {
        for (const item of order.items) {
          operationalTotalMeals += item.quantity;
        }
      }
    }
  }

  // 4. Calculate Operations Metrics (bound to resolvedOperationalDate)
  let total = 0, pending = 0, accepted = 0, ready = 0, collected = 0;
  let subscriptionOrders = 0, cashOrders = 0, pendingRequiresAttention = 0;
  const now = new Date().getTime();

  for (const order of executionOrdersList) {
    if (order.status === 'cancelled') continue;
    
    total++;
    
    if (order.status === 'pending') pending++;
    else if (order.status === 'confirmed' || order.status === 'preparing') accepted++;
    else if (order.status === 'ready') ready++;
    else if (order.status === 'picked_up' || order.status === 'delivered') collected++;

    if (order.orderType === 'subscription') subscriptionOrders++;
    if (order.paymentMethod === 'cash') cashOrders++;

    if (order.status === 'pending') {
      const orderTime = new Date(order.createdAt).getTime();
      const diffMins = (now - orderTime) / (1000 * 60);
      if (diffMins > 15) {
        pendingRequiresAttention++;
      }
    }
  }

  // 5. Walk-in Sales Metrics
  let walkInSalesCount = 0;
  let walkInRevenue = 0;
  for (const walkIn of walkInSalesList) {
    walkInSalesCount++;
    walkInRevenue += walkIn.totalAmount;
    // Count walk-in meals in the total collected and meal counts
    collected++;
    total++;
  }

  // 6. Most Ordered Meal (Operations dataset + Walk-in sales)
  let mostOrderedMeal: string | null = 'No orders yet';
  const mealCounts: Record<string, number> = {};

  for (const order of executionOrdersList) {
    if (order.status === 'cancelled') continue;
    if (order.items) {
      for (const item of order.items) {
        mealCounts[item.mealName] = (mealCounts[item.mealName] || 0) + item.quantity;
      }
    }
  }

  // Include walk-in meals
  for (const walkIn of walkInSalesList) {
    mealCounts[walkIn.mealName] = (mealCounts[walkIn.mealName] || 0) + walkIn.quantity;
  }

  let max = 0;
  for (const [mealName, qty] of Object.entries(mealCounts)) {
    if (qty > max) {
      max = qty;
      mostOrderedMeal = mealName;
    }
  }
  if (total === 0 || max === 0) {
    mostOrderedMeal = 'No orders yet';
  }

  const sourceOrderIds = executionOrdersList
    .filter((o) => o.status !== 'cancelled')
    .map((o) => o.id)
    .sort();

  return {
    executionOrders: {
      total,
      pending,
      accepted,
      ready,
      collected,
    },
    activeSubscribers: activeSubCount || 0,
    operationalReservations: operationalResCount,
    operationalTotalMeals,
    insights: {
      mostOrderedMeal,
      subscriptionOrders,
      cashOrders,
      walkInSales: walkInSalesCount,
      walkInRevenue,
      pendingRequiresAttention,
    },
    sourceOrderIds,
    lastBackendFetchAt: new Date().toISOString(),
    holidayExecution,
    holidayOperational,
  };
};

export const useDashboardMetrics = (
  stallId: string,
  calendarDate: string,
  resolvedOperationalDate: string | null,
  preparationDate: string,
  isResolving: boolean
) => {
  return useQuery({
    queryKey: dashboardKeys.summary(stallId, resolvedOperationalDate),
    queryFn: () => fetchDashboardMetrics(stallId, calendarDate, resolvedOperationalDate, preparationDate),
    enabled: !isResolving && !!stallId,
    staleTime: 5000,
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
    reservedMeals: string[];
    quantity: number;
    expectedPickupSlot?: string;
  }[];
  holidayOperational: KitchenHoliday | null;
}

export const fetchOperationalReservationsDetailed = async (
  stallId: string,
  preparationDate: string
): Promise<OperationalReservationDetails> => {
  const [orders, holidayOperational] = await Promise.all([
    fetchOrders({
      stallId: stallId,
      date: preparationDate,
      includeCancelled: false,
      statusIn: ['pending', 'confirmed', 'preparing', 'ready'],
    }),
    getHolidayForDate(preparationDate, stallId)
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

export const useOperationalReservationsDetailed = (stallId: string, preparationDate: string, isResolving: boolean) => {
  return useQuery({
    queryKey: dashboardKeys.preparation(stallId, preparationDate),
    queryFn: () => fetchOperationalReservationsDetailed(stallId, preparationDate),
    enabled: !isResolving && !!preparationDate && !!stallId,
    staleTime: 5000,
  });
};
