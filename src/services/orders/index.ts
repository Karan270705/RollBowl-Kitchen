import { supabase } from '@/src/lib/supabase';
import { Order, OrderItem } from '@/src/types/models';
import { AppError } from '@/src/utils/errors';
import { getDeviceId } from '@/src/utils/device';

export const getPrimaryStallId = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('stalls')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('No active stall found.');
  }
  return data.id;
};

export interface FetchOrdersOptions {
  date?: string; // e.g. formatDateKey(today)
  includeFuture?: boolean; // if true, ignores date and fetches >= today
  includeCancelled?: boolean;
  statusIn?: Order['status'][];
  stallId?: string;
}

export const fetchOrders = async (options: FetchOrdersOptions): Promise<Order[]> => {
  const actualStallId = options.stallId || await getPrimaryStallId();
  
  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      user_id,
      customer_name,
      stall_id,
      stall_name,
      status,
      order_type,
      payment_status,
      payment_method,
      payment_verification_status,
      payment_proof_deadline,
      subtotal,
      tax,
      discount,
      total,
      notes,
      expected_pickup_slot,
      pickup_date,
      estimated_ready_time,
      created_at,
      updated_at,
      users ( phone )
    `)
    .eq('stall_id', actualStallId);

  if (!options.includeCancelled) {
    query = query.neq('status', 'cancelled');
  }

  if (options.statusIn && options.statusIn.length > 0) {
    query = query.in('status', options.statusIn);
  }

  if (options.includeFuture) {
    // For orders page: we want today AND future
  } else if (options.date && options.date !== 'all' && options.date !== 'null' && /^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    query = query.eq('pickup_date', options.date);
  }

  const { data: ordersData, error: ordersError } = await query
    .order('pickup_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;

  if (!ordersData || ordersData.length === 0) return [];

  const orderIds = ordersData.map((o: any) => o.id);

  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  if (itemsError) throw itemsError;

  const itemsByOrderId = (itemsData || []).reduce((acc: any, item: any) => {
    if (!acc[item.order_id]) acc[item.order_id] = [];
    acc[item.order_id].push({
      id: item.id,
      orderId: item.order_id,
      mealId: item.meal_id,
      mealName: item.meal_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
      specialInstructions: item.special_instructions ?? undefined,
      subscriptionId: item.subscription_id ?? undefined,
      creditsUsed:
        item.credits_used != null
          ? Number(item.credits_used)
          : item.subscription_id || Number(item.unit_price) === 0
          ? Number(item.quantity)
          : 0,
      createdAt: item.created_at,
    });
    return acc;
  }, {});

  const subIds = [
    ...new Set(
      (itemsData || []).map((item: any) => item.subscription_id).filter(Boolean)
    ),
  ];
  const userIdsForSubs = ordersData
    .filter((o: any) => o.order_type === 'subscription')
    .map((o: any) => o.user_id)
    .filter(Boolean);

  const planNamesBySubId: Record<string, string> = {};
  const planNamesByUserId: Record<string, string> = {};

  if (subIds.length > 0) {
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('id, plan_name')
      .in('id', subIds);
    if (subsData) {
      subsData.forEach((s: any) => {
        if (s.plan_name) planNamesBySubId[s.id] = s.plan_name;
      });
    }
  }

  if (userIdsForSubs.length > 0) {
    const { data: userSubs } = await supabase
      .from('subscriptions')
      .select('user_id, plan_name')
      .in('user_id', userIdsForSubs)
      .order('created_at', { ascending: false });
    if (userSubs) {
      userSubs.forEach((s: any) => {
        if (s.plan_name && !planNamesByUserId[s.user_id]) {
          planNamesByUserId[s.user_id] = s.plan_name;
        }
      });
    }
  }

  const orders = ordersData.map((row: any): Order => {
    const orderItems: OrderItem[] = itemsByOrderId[row.id] || [];
    const firstSubItem = orderItems.find((i) => i.subscriptionId);
    const hasSubItem =
      row.order_type === 'subscription' ||
      orderItems.some((i) => i.subscriptionId || i.unitPrice === 0);
    const planName =
      (firstSubItem && planNamesBySubId[firstSubItem.subscriptionId!]) ||
      planNamesByUserId[row.user_id] ||
      (hasSubItem ? 'Solo Plan' : undefined);

    const totalCreditsUsed = orderItems.reduce((sum, item) => {
      const isSubItem =
        Boolean(item.subscriptionId) ||
        (row.order_type === 'subscription' && item.unitPrice === 0);
      return sum + (isSubItem ? item.creditsUsed || item.quantity : 0);
    }, 0);

    return {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.user_id,
      customerName: row.customer_name,
      customerPhone: row.users?.phone,
      stallId: row.stall_id,
      stallName: row.stall_name,
      status: row.status,
      orderType: row.order_type,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      paymentVerificationStatus: row.payment_verification_status ?? undefined,
      paymentProofDeadline: row.payment_proof_deadline ?? undefined,
      subtotal: Number(row.subtotal),
      tax: Number(row.tax),
      discount: Number(row.discount),
      total: Number(row.total),
      subscriptionPlanName: planName,
      creditsUsed: totalCreditsUsed,
      notes: row.notes ?? undefined,
      expectedPickupSlot: row.expected_pickup_slot ?? undefined,
      pickupDate: row.pickup_date,
      estimatedReadyTime: row.estimated_ready_time ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: orderItems,
    };
  });

  logAuthoritativeState(orders, actualStallId, options.date);
  return orders;
};

export const logAuthoritativeState = (
  orders: Order[],
  stallId: string,
  operationalDate?: string | null
): void => {
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
  const sourceOrderIds = nonCancelled.map((o) => o.id).sort();

  let total = 0;
  let pending = 0;
  let accepted = 0;
  let ready = 0;
  let collected = 0;
  let cashOrders = 0;
  let subscriptionOrders = 0;
  const mealCounts: Record<string, number> = {};

  for (const order of nonCancelled) {
    total++;
    if (order.status === 'pending') pending++;
    else if (order.status === 'confirmed' || order.status === 'preparing') accepted++;
    else if (order.status === 'ready') ready++;
    else if (order.status === 'picked_up' || order.status === 'delivered') collected++;

    if (order.paymentMethod === 'cash') cashOrders++;
    if (order.orderType === 'subscription') subscriptionOrders++;

    if (order.items) {
      for (const item of order.items) {
        mealCounts[item.mealName] = (mealCounts[item.mealName] || 0) + item.quantity;
      }
    }
  }

  let max = 0;
  let mostOrdered: string | null = null;
  for (const [mealName, qty] of Object.entries(mealCounts)) {
    if (qty > max) {
      max = qty;
      mostOrdered = mealName;
    }
  }

  console.log(
    '[KITCHEN AUTHORITATIVE STATE]',
    JSON.stringify(
      {
        deviceId: getDeviceId(),
        stallId,
        operationalDate: operationalDate || 'all',
        sourceOrderIds,
        total,
        pending,
        accepted,
        ready,
        collected,
        cashOrders,
        subscriptionOrders,
        mostOrdered,
        fetchedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
};

const parseAcceptOrderError = (error: any): Error => {
  const message = error?.message || error?.details || String(error);
  if (message.includes('INSUFFICIENT_SUBSCRIPTION_CREDITS') || message.includes('INSUFFICIENT_CREDITS')) {
    return new Error('Customer has insufficient subscription credits remaining.');
  }
  if (message.includes('DAILY_CREDIT_LIMIT_EXCEEDED')) {
    return new Error('Order exceeds customer\'s daily subscription credit limit at acceptance.');
  }
  if (message.includes('SUBSCRIPTION_NOT_ACTIVE')) {
    return new Error('Customer\'s subscription is not active.');
  }
  if (message.includes('SUBSCRIPTION_DATE_INVALID')) {
    return new Error('Order service date falls outside subscription validity duration.');
  }
  if (message.includes('SUBSCRIPTION_RESERVATION_MISSING')) {
    return new Error('Subscription reservation missing for this order.');
  }
  if (message.includes('INVALID_RESERVATION_STATUS')) {
    return new Error('Subscription credit reservation is no longer in reserved status.');
  }
  return new Error(error?.message || 'Failed to accept order.');
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
  // 1. Validate Cash Order Collection Rule
  if (status === 'picked_up' || status === 'delivered') {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('payment_method, payment_status')
      .eq('id', orderId)
      .single();
      
    if (orderError) throw orderError;
    
    if (orderData.payment_method === 'cash' && orderData.payment_status !== 'paid') {
      throw new AppError(
        'CASH_PAYMENT_REQUIRED',
        'Mark this cash order as paid before collecting it.'
      );
    }
  }

  // 2. Authoritative Kitchen Acceptance via RPC when status is confirmed
  if (status === 'confirmed') {
    const { data, error } = await supabase.rpc('accept_order', {
      p_order_id: orderId,
    });

    if (error) {
      throw parseAcceptOrderError(error);
    }

    // Trigger customer notification asynchronously (non-blocking)
    (async () => {
      try {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('user_id, order_number')
          .eq('id', orderId)
          .single();
        if (orderRow) {
          await notifyOrderStatusChanged(orderRow.user_id, orderRow.order_number, orderId, 'confirmed');
        }
      } catch (err: any) {
        console.error('Failed to notify customer on order confirmation:', err);
      }
    })();

    return;
  }

  // 3. Perform standard update for other lifecycle transitions (preparing, ready, collected, etc.)
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select();

  if (error) throw error;
  
  if (!data || data.length === 0) {
    throw new Error('Failed to update order status. You may not have permission.');
  }

  // Trigger notification event for customer (async, don't await so we don't block UI)
  const row = data[0];
  notifyOrderStatusChanged(row.user_id, row.order_number, row.id, status).catch(err => {
    console.error('Failed to notify customer:', err);
  });
};

export const updateOrderPaymentStatus = async (orderId: string, status: Order['paymentStatus']): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

/**
 * Maps the order status to an event type and calls the create_notification RPC.
 * To avoid duplicating message content, we pass empty strings and let the 
 * Customer App resolve the actual title/body based on the event payload.
 */
export const notifyOrderStatusChanged = async (
  userId: string,
  orderNumber: string,
  orderId: string,
  status: Order['status']
) => {
  let event = '';
  switch (status) {
    case 'confirmed': event = 'ORDER_ACCEPTED'; break;
    case 'preparing': event = 'ORDER_PREPARING'; break; // Keep for fallback legacy orders
    case 'ready': event = 'ORDER_READY'; break;
    case 'picked_up': event = 'ORDER_COLLECTED'; break;
    case 'cancelled': event = 'ORDER_CANCELLED'; break;
    default: return; // No notification for other statuses (e.g., pending)
  }

  const { error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_title: '',
    p_body: '',
    p_type: 'order_update',
    p_data: { event, orderId, orderNumber }
  });

  if (error) {
    console.error('Error in notifyOrderStatusChanged:', error);
  }
};
