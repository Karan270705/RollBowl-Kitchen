import { supabase } from '@/src/lib/supabase';
import { Order, OrderItem } from '@/src/types/models';

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

export const fetchActiveAndRecentOrders = async (stallId?: string): Promise<Order[]> => {
  const actualStallId = stallId || await getPrimaryStallId();

  // Fetch orders that are not cancelled, mostly focusing on today's queue
  // In a real app we might paginate or filter by specific pickup_date ranges.
  const { data: ordersData, error: ordersError } = await supabase
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
      subtotal,
      tax,
      discount,
      total,
      notes,
      pickup_date,
      estimated_ready_time,
      created_at,
      updated_at
    `)
    .eq('stall_id', actualStallId)
    .neq('status', 'cancelled')
    .order('pickup_date', { ascending: true })
    .order('created_at', { ascending: true });

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
      createdAt: item.created_at,
    });
    return acc;
  }, {});

  return ordersData.map((row: any): Order => ({
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerName: row.customer_name,
    stallId: row.stall_id,
    stallName: row.stall_name,
    status: row.status,
    orderType: row.order_type,
    paymentStatus: row.payment_status,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    discount: Number(row.discount),
    total: Number(row.total),
    notes: row.notes ?? undefined,
    pickupDate: row.pickup_date,
    estimatedReadyTime: row.estimated_ready_time ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: itemsByOrderId[row.id] || [],
  }));
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
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
    case 'preparing': event = 'ORDER_PREPARING'; break;
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
