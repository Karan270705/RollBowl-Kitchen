import { supabase } from '@/src/lib/supabase';
import * as XLSX from 'xlsx';
import { buildCsvString } from '@/src/utils/export/csv';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface ExportProgress {
  stage: string;
  percent?: number;
}

const PAGE_SIZE = 1000;
const ITEM_BATCH_SIZE = 200;

export const fetchOrdersForExport = async (
  stallId: string, 
  fromDate: string, 
  toDate: string,
  onProgress?: (p: ExportProgress) => void
) => {
  onProgress?.({ stage: 'Fetching orders...' });

  const allOrders: any[] = [];
  let hasMore = true;
  let page = 0;

  while (hasMore) {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, pickup_date, created_at, user_id, 
        customer_name, stall_name, order_type, payment_method, payment_status,
        subtotal, tax, discount, total, expected_pickup_slot, status, notes
      `)
      .eq('stall_id', stallId)
      .gte('pickup_date', fromDate)
      .lte('pickup_date', toDate)
      .order('pickup_date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(start, end);

    if (error) throw error;
    
    if (data && data.length > 0) {
      allOrders.push(...data);
    }
    
    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }

  if (allOrders.length === 0) {
    return { orders: [], orderItems: [], customers: {}, meals: {} };
  }

  onProgress?.({ stage: 'Fetching order items...' });
  
  const orderIds = allOrders.map(o => o.id);
  const allOrderItems: any[] = [];
  
  // Chunk order IDs to prevent massive IN queries
  const idChunks = [];
  for (let i = 0; i < orderIds.length; i += ITEM_BATCH_SIZE) {
    idChunks.push(orderIds.slice(i, i + ITEM_BATCH_SIZE));
  }

  for (const chunk of idChunks) {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id, order_id, meal_id, meal_name, quantity, unit_price, total_price, 
        subscription_id, credits_used
      `)
      .in('order_id', chunk);
      
    if (error) throw error;
    if (data) allOrderItems.push(...data);
  }

  onProgress?.({ stage: 'Fetching customer and menu details...' });

  // Fetch unique users (for phone/email)
  const userIds = [...new Set(allOrders.map(o => o.user_id).filter(Boolean))];
  const customers: Record<string, any> = {};
  
  const userChunks = [];
  for (let i = 0; i < userIds.length; i += ITEM_BATCH_SIZE) {
    userChunks.push(userIds.slice(i, i + ITEM_BATCH_SIZE));
  }

  for (const chunk of userChunks) {
    const { data, error } = await supabase
      .from('users')
      .select('id, phone, email')
      .in('id', chunk);
      
    if (error) throw error;
    if (data) {
      data.forEach(u => { customers[u.id] = u; });
    }
  }

  // Fetch unique meals for Category
  const mealIds = [...new Set(allOrderItems.map(oi => oi.meal_id).filter(Boolean))];
  const meals: Record<string, any> = {};

  const mealChunks = [];
  for (let i = 0; i < mealIds.length; i += ITEM_BATCH_SIZE) {
    mealChunks.push(mealIds.slice(i, i + ITEM_BATCH_SIZE));
  }

  for (const chunk of mealChunks) {
    const { data, error } = await supabase
      .from('meals')
      .select('id, category')
      .in('id', chunk);
      
    if (error) throw error;
    if (data) {
      data.forEach(m => { meals[m.id] = m; });
    }
  }

  return { orders: allOrders, orderItems: allOrderItems, customers, meals };
};

export const buildOrdersSheetData = (dataset: any) => {
  const { orders, orderItems, customers } = dataset;
  
  // Group items by order
  const itemsByOrder = orderItems.reduce((acc: any, item: any) => {
    if (!acc[item.order_id]) acc[item.order_id] = [];
    acc[item.order_id].push(item);
    return acc;
  }, {});

  const rows = [
    [
      'Order ID', 'Order Number', 'Pickup Date', 'Created At', 'Customer Name', 
      'Customer Phone', 'Customer Email', 'Order Type', 'Payment Method', 'Payment Status',
      'Subtotal (₹)', 'Tax (₹)', 'Discount (₹)', 'Total Amount (₹)', 'Expected Pickup Slot',
      'Order Status', 'Stall Name / Pickup Location', 'Subscription Used', 'Total Quantity', 
      'Item Summary', 'Notes'
    ]
  ];

  for (const order of orders) {
    const user = customers[order.user_id] || {};
    const items = itemsByOrder[order.id] || [];
    
    const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
    const itemSummary = items.map((i: any) => `${i.meal_name} x${i.quantity}`).join(', ');
    const isSubscriptionUsed = items.some((i: any) => !!i.subscription_id);

    rows.push([
      String(order.id),
      String(order.order_number),
      order.pickup_date,
      new Date(order.created_at).toLocaleString(),
      order.customer_name || 'Not Provided',
      user.phone || 'Not Provided',
      user.email || 'Not Provided',
      order.order_type,
      order.payment_method,
      order.payment_status,
      Number(order.subtotal || 0),
      Number(order.tax || 0),
      Number(order.discount || 0),
      Number(order.total || 0),
      order.expected_pickup_slot || 'Not Provided',
      order.status,
      order.stall_name,
      isSubscriptionUsed ? 'Yes' : 'No',
      totalQty,
      itemSummary || 'Not Provided',
      order.notes || 'Not Provided'
    ]);
  }

  return rows;
};

export const buildOrderItemsSheetData = (dataset: any) => {
  const { orders, orderItems, customers, meals } = dataset;
  
  const ordersById = orders.reduce((acc: any, o: any) => {
    acc[o.id] = o;
    return acc;
  }, {});

  const rows = [
    [
      'Order ID', 'Order Number', 'Pickup Date', 'Customer Name', 'Item ID',
      'Item Name', 'Category', 'Quantity', 'Unit Price (₹)', 'Total Price (₹)',
      'Subscription Applied', 'Subscription ID', 'Credits Consumed', 'Order Status',
      'Payment Method', 'Payment Status'
    ]
  ];

  for (const item of orderItems) {
    const order = ordersById[item.order_id];
    if (!order) continue;
    
    const meal = meals[item.meal_id] || {};

    rows.push([
      String(order.id),
      String(order.order_number),
      order.pickup_date,
      order.customer_name || 'Not Provided',
      String(item.meal_id),
      item.meal_name,
      meal.category || 'Not Provided',
      Number(item.quantity || 0),
      Number(item.unit_price || 0),
      Number(item.total_price || 0),
      item.subscription_id ? 'Yes' : 'No',
      item.subscription_id ? String(item.subscription_id) : 'Not Provided',
      Number(item.credits_used || 0),
      order.status,
      order.payment_method,
      order.payment_status
    ]);
  }

  return rows;
};

export const buildSummarySheetData = (dataset: any, fromDate: string, toDate: string) => {
  const { orders, orderItems } = dataset;
  
  let totalOrders = 0;
  let pendingOrders = 0;
  let preparingOrders = 0;
  let readyOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let directOrders = 0;
  let subOrders = 0;
  let cashOrders = 0;
  let upiOrders = 0;
  let cardOrders = 0;
  
  let grossValue = 0;
  let paidRevenue = 0;
  let pendingCash = 0;
  let totalItems = 0;
  
  /**
   * IMPORTANT LIMITATION - SUBSCRIPTION REVENUE:
   * The Kitchen App reports operational order revenue directly from `orders.total` and `order_items.total_price`.
   * For subscription-credit orders, `total` is naturally 0 (or strictly delivery/tax fees).
   * This means subscription *purchase* revenue is NOT represented in this export.
   * 
   * Future comprehensive revenue reports must use `payment_records.amount` or `subscriptions.purchase_price`.
   * They must NEVER derive past revenue from the current `subscription_plans.price` catalogue value.
   */
  
  const customerIds = new Set<string>();
  const itemCounts: Record<string, number> = {};
  const slotCounts: Record<string, number> = {};
  
  // Build lookup for order status to properly filter order items
  const validOrderIds = new Set<string>();

  let firstStallName = orders.length > 0 ? orders[0].stall_name : 'Unknown';

  for (const order of orders) {
    totalOrders++;
    
    if (order.status === 'cancelled') {
      cancelledOrders++;
    } else {
      validOrderIds.add(order.id);
      
      if (order.status === 'pending') pendingOrders++;
      else if (order.status === 'preparing') preparingOrders++;
      else if (order.status === 'ready') readyOrders++;
      else if (order.status === 'picked_up' || order.status === 'delivered') completedOrders++;
      
      if (order.order_type === 'subscription') subOrders++;
      else directOrders++;
      
      if (order.payment_method === 'cash') cashOrders++;
      else if (order.payment_method === 'upi') upiOrders++;
      else if (order.payment_method === 'card') cardOrders++;
      
      const total = Number(order.total || 0);
      grossValue += total;
      
      // Determine Paid Revenue (if payment_status === 'paid' or equivalent, check schema)
      if (order.payment_status === 'paid') {
        paidRevenue += total;
      } else if (order.payment_status === 'pending' && order.payment_method === 'cash') {
        pendingCash += total;
      }
      
      if (order.user_id) customerIds.add(order.user_id);
      
      const slot = order.expected_pickup_slot;
      if (slot) {
        slotCounts[slot] = (slotCounts[slot] || 0) + 1;
      }
    }
  }
  
  for (const item of orderItems) {
    if (validOrderIds.has(item.order_id)) {
      const qty = Number(item.quantity || 0);
      totalItems += qty;
      itemCounts[item.meal_name] = (itemCounts[item.meal_name] || 0) + qty;
    }
  }

  let mostOrdered = 'None';
  let maxOrdered = 0;
  for (const [name, qty] of Object.entries(itemCounts)) {
    if (qty > maxOrdered) {
      mostOrdered = name;
      maxOrdered = qty;
    }
  }
  
  let peakSlot = 'None';
  let maxSlot = 0;
  for (const [slot, count] of Object.entries(slotCounts)) {
    if (count > maxSlot) {
      peakSlot = slot;
      maxSlot = count;
    }
  }

  return [
    ['Metric', 'Value'],
    ['Report Title', 'Order Export'],
    ['From Date', fromDate],
    ['To Date', toDate],
    ['Generated At', new Date().toLocaleString()],
    ['Kitchen / Stall Name', firstStallName],
    [],
    ['Total Orders (Including Cancelled)', totalOrders],
    ['Pending Orders', pendingOrders],
    ['Preparing Orders', preparingOrders],
    ['Ready Orders', readyOrders],
    ['Completed / Collected Orders', completedOrders],
    ['Cancelled Orders', cancelledOrders],
    [],
    ['Direct Orders (Valid)', directOrders],
    ['Subscription Orders (Valid)', subOrders],
    ['Cash Orders (Valid)', cashOrders],
    ['UPI Orders (Valid)', upiOrders],
    ['Card Orders (Valid)', cardOrders],
    [],
    ['Gross Ordered Value (₹)', grossValue],
    ['Paid / Collected Revenue (₹)', paidRevenue],
    ['Pending Cash Amount (₹)', pendingCash],
    [],
    ['Total Items Ordered', totalItems],
    ['Unique Customers', customerIds.size],
    ['Most Ordered Item', mostOrdered !== 'None' ? `${mostOrdered} (${maxOrdered})` : 'None'],
    ['Peak Pickup Slot', peakSlot !== 'None' ? `${peakSlot} (${maxSlot} orders)` : 'None']
  ];
};

export const generateXlsxBase64 = (dataset: any, fromDate: string, toDate: string) => {
  const wb = XLSX.utils.book_new();
  
  const summaryData = buildSummarySheetData(dataset, fromDate, toDate);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  
  const ordersData = buildOrdersSheetData(dataset);
  const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
  wsOrders['!cols'] = [
    { wch: 40 }, // Order ID
    { wch: 15 }, // Order Num
    { wch: 12 }, // Pickup Date
    { wch: 20 }, // Created At
    { wch: 20 }, // Cust Name
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 15 }, // Type
    { wch: 15 }, // Pay Method
    { wch: 15 }, // Pay Status
    { wch: 12 }, // Subtotal
    { wch: 10 }, // Tax
    { wch: 10 }, // Discount
    { wch: 15 }, // Total
    { wch: 20 }, // Slot
    { wch: 15 }, // Status
    { wch: 20 }, // Stall
    { wch: 15 }, // Sub Used
    { wch: 15 }, // Qty
    { wch: 40 }, // Summary
    { wch: 40 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');
  
  const itemsData = buildOrderItemsSheetData(dataset);
  const wsItems = XLSX.utils.aoa_to_sheet(itemsData);
  wsItems['!cols'] = [
    { wch: 40 }, // Order ID
    { wch: 15 }, // Order Num
    { wch: 12 }, // Pickup Date
    { wch: 20 }, // Cust Name
    { wch: 40 }, // Item ID
    { wch: 25 }, // Item Name
    { wch: 20 }, // Category
    { wch: 10 }, // Qty
    { wch: 15 }, // Unit Price
    { wch: 15 }, // Total Price
    { wch: 15 }, // Sub Applied
    { wch: 40 }, // Sub ID
    { wch: 15 }, // Credits
    { wch: 15 }, // Status
    { wch: 15 }, // Pay Method
    { wch: 15 }, // Pay Status
  ];
  XLSX.utils.book_append_sheet(wb, wsItems, 'Order Items');

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
};

export const saveAndShareExport = async (
  filename: string, 
  content: string, 
  encoding: FileSystem.EncodingType,
  mimeType: string
) => {
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, content, { encoding });
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export Orders' });
  } else {
    throw new Error('Sharing is not available on this device');
  }
};
