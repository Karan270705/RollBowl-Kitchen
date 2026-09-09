import { supabase } from '@/src/lib/supabase';
import * as XLSX from 'xlsx';
import { buildCsvString } from '@/src/utils/export/csv';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getTodayISTDateString } from '@/src/utils/operationalDate';

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
        subtotal, tax, discount, total, expected_pickup_slot, status, notes,
        payment_verification_status
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

  // Deduplicate orders by ID across page boundaries
  const uniqueOrdersMap = new Map();
  for (const o of allOrders) {
    if (!uniqueOrdersMap.has(o.id)) {
      uniqueOrdersMap.set(o.id, o);
    }
  }
  const deduplicatedOrders = Array.from(uniqueOrdersMap.values());

  onProgress?.({ stage: 'Fetching order items...' });
  
  const orderIds = deduplicatedOrders.map(o => o.id);
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

  onProgress?.({ stage: 'Fetching walk-in sales from inventory movements...' });

  // 1. Fetch batches for this stall in the date range
  const { data: batchesData } = await supabase
    .from('inventory_batches')
    .select('id, stall_id, inventory_date, window_start, window_end, status')
    .eq('stall_id', stallId)
    .gte('created_at', `${fromDate}T00:00:00.000Z`)
    .lte('created_at', `${toDate}T23:59:59.999Z`);
    
  const inventoryBatches: Record<string, any> = {};
  const batchIds = (batchesData || []).map(b => b.id);
  
  if (batchesData) {
    batchesData.forEach(b => { inventoryBatches[b.id] = b; });
  }

  let walkInMovements: any[] = [];
  if (batchIds.length > 0) {
    // 2. Fetch walk-in movements for these batches
    const { data: invMovementsData } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('movement_type', 'walk_in_sale')
      .in('inventory_batch_id', batchIds);
      
    walkInMovements = invMovementsData || [];
  }

  onProgress?.({ stage: 'Fetching active subscriptions...' });

  // Fetch active subscriptions for Subscription Customers sheet
  const { data: subsData } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_name, total_meals, meals_per_day, remaining_meals, consumed_meals, purchase_price, currency, start_date, end_date, status, created_at')
    .eq('stall_id', stallId)
    .eq('status', 'active')
    .lte('start_date', getTodayISTDateString())
    .gte('end_date', getTodayISTDateString());
  const subscriptions = subsData || [];

  let purchaseRequests: any[] = [];
  if (subscriptions.length > 0) {
    const subIds = subscriptions.map(s => s.id).filter(Boolean);
    const { data: reqsData } = await supabase
      .from('subscription_purchase_requests')
      .select('*')
      .in('created_subscription_id', subIds);
    if (reqsData && reqsData.length > 0) {
      purchaseRequests = reqsData;
    } else {
      const subUserIds = subscriptions.map(s => s.user_id).filter(Boolean);
      if (subUserIds.length > 0) {
        const { data: reqsByUser } = await supabase
          .from('subscription_purchase_requests')
          .select('*')
          .in('user_id', subUserIds);
        if (reqsByUser) purchaseRequests = reqsByUser;
      }
    }
  }

  onProgress?.({ stage: 'Fetching customer and menu details...' });

  // Fetch unique users (for phone/email/operator)
  const userIds = [
    ...new Set([
      ...deduplicatedOrders.map(o => o.user_id),
      ...subscriptions.map(s => s.user_id),
      ...walkInMovements.map(m => m.created_by),
    ].filter(Boolean)),
  ];
  const customers: Record<string, any> = {};
  
  const userChunks = [];
  for (let i = 0; i < userIds.length; i += ITEM_BATCH_SIZE) {
    userChunks.push(userIds.slice(i, i + ITEM_BATCH_SIZE));
  }

  for (const chunk of userChunks) {
    const { data, error } = await supabase
      .from('users')
      .select('id, phone, email, name')
      .in('id', chunk);
      
    if (error) throw error;
    if (data) {
      data.forEach(u => { customers[u.id] = u; });
    }
  }

  // Fetch unique meals for Category, Name, Price
  const mealIds = [
    ...new Set([
      ...allOrderItems.map(oi => oi.meal_id),
      ...walkInMovements.map(m => m.meal_id),
    ].filter(Boolean)),
  ];
  const meals: Record<string, any> = {};

  const mealChunks = [];
  for (let i = 0; i < mealIds.length; i += ITEM_BATCH_SIZE) {
    mealChunks.push(mealIds.slice(i, i + ITEM_BATCH_SIZE));
  }

  for (const chunk of mealChunks) {
    const { data, error } = await supabase
      .from('meals')
      .select('id, category, name, price')
      .in('id', chunk);
      
    if (error) throw error;
    if (data) {
      data.forEach(m => { meals[m.id] = m; });
    }
  }

  return {
    orders: deduplicatedOrders,
    orderItems: allOrderItems,
    customers,
    meals,
    subscriptions,
    walkInMovements,
    inventoryBatches,
    purchaseRequests,
  };
};

const toIST = (ts?: string) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return ts;
  }
};

const getDayName = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return '';
  }
};

const isValidOrder = (o: any) => {
  return (
    o.status !== 'cancelled' &&
    o.status !== 'rejected' &&
    o.status !== 'expired' &&
    o.payment_verification_status !== 'expired' &&
    o.payment_verification_status !== 'rejected'
  );
};

const isSubscription = (o: any) => {
  return o.order_type === 'subscription' || o.payment_method === 'subscription';
};

const formatNotes = (notes: any) => {
  if (!notes) return '';
  if (typeof notes === 'object') return JSON.stringify(notes);
  return String(notes);
};

const getPlanNameForSub = (subId?: string, dataset?: any) => {
  if (!subId || !dataset) return 'Plus Plan';
  const sub = (dataset.subscriptions || []).find((s: any) => s.id === subId);
  if (sub && sub.plan_name) return sub.plan_name;
  const req = (dataset.purchaseRequests || []).find((r: any) => r.created_subscription_id === subId);
  if (req && req.plan_name_snapshot) return req.plan_name_snapshot;
  return 'Plus Plan';
};

export const buildDayWiseSummarySheetData = (dataset: any) => {
  const { orders = [], orderItems = [], meals = {}, inventoryBatches = {}, walkInMovements = [] } = dataset;
  const validOrders = orders.filter((o: any) => isValidOrder(o));

  // Map order items by order_id
  const itemsByOrder = orderItems.reduce((acc: any, item: any) => {
    if (!acc[item.order_id]) acc[item.order_id] = [];
    acc[item.order_id].push(item);
    return acc;
  }, {});

  // Grouping map: key = `${serviceDate}|${mealName}|${sourceType}`
  const summaryMap: Record<string, { serviceDate: string; mealName: string; orderType: string; totalQuantity: number }> = {};

  for (const o of validOrders) {
    const serviceDate = o.pickup_date || (o.created_at ? String(o.created_at).slice(0, 10) : 'Unknown');
    const items = itemsByOrder[o.id] || [];
    for (const item of items) {
      const mealName = item.meal_name || meals[item.meal_id]?.name || 'Unknown Meal';
      const key = `${serviceDate}|${mealName}|Customer Order`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          serviceDate,
          mealName,
          orderType: 'Customer Order',
          totalQuantity: 0,
        };
      }
      summaryMap[key].totalQuantity += Number(item.quantity || 0);
    }
  }

  // Process walk-in movements
  for (const m of walkInMovements) {
    const batch = inventoryBatches[m.inventory_batch_id];
    const serviceDate = batch?.inventory_date || (m.created_at ? String(m.created_at).slice(0, 10) : 'Unknown');
    const mealName = meals[m.meal_id]?.name || 'Unknown Meal';
    const key = `${serviceDate}|${mealName}|Walk-in Sale`;
    if (!summaryMap[key]) {
      summaryMap[key] = {
        serviceDate,
        mealName,
        orderType: 'Walk-in Sale',
        totalQuantity: 0,
      };
    }
    summaryMap[key].totalQuantity += Number(m.quantity || 0);
  }

  // Sort: Service Date ascending, then Meal / Combo alphabetically
  const sortedEntries = Object.values(summaryMap).sort((a, b) => {
    const dateCmp = a.serviceDate.localeCompare(b.serviceDate);
    if (dateCmp !== 0) return dateCmp;
    return a.mealName.localeCompare(b.mealName);
  });

  const rows: any[][] = [
    [
      'Service Date',
      'Day',
      'Meal / Combo',
      'Total Quantity',
      'Order Type',
    ],
  ];

  for (const entry of sortedEntries) {
    rows.push([
      entry.serviceDate,
      getDayName(entry.serviceDate),
      entry.mealName,
      Number(entry.totalQuantity),
      entry.orderType,
    ]);
  }

  return rows;
};

export const buildCustomerOrderDetailsSheetData = (dataset: any) => {
  const { orders = [], orderItems = [], customers = {}, meals = {} } = dataset;
  const validCustomerOrders = orders.filter((o: any) => isValidOrder(o));

  const itemsByOrder = orderItems.reduce((acc: any, item: any) => {
    if (!acc[item.order_id]) acc[item.order_id] = [];
    acc[item.order_id].push(item);
    return acc;
  }, {});

  const rows: any[][] = [
    [
      'Order Number',
      'Service Date',
      'Day',
      'Order Created At',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Meal / Combo',
      'Quantity',
      'Unit Price',
      'Item Total',
      'Credits Used',
      'Order Type',
      'Payment Method',
      'Payment Status',
      'Payment Verification Status',
      'Order Status',
      'Pickup Slot',
      'Subscription Plan',
      'Subscription ID',
      'Notes',
    ],
  ];

  for (const o of validCustomerOrders) {
    const user = customers[o.user_id] || {};
    const items = itemsByOrder[o.id] || [];
    const serviceDate = o.pickup_date || (o.created_at ? String(o.created_at).slice(0, 10) : '');
    const dayName = getDayName(serviceDate);
    const orderCreatedAt = toIST(o.created_at);
    const customerName = user.name || o.customer_name || 'Customer';
    const customerEmail = user.email || 'N/A';
    const customerPhone = user.phone || 'N/A';
    const orderType = o.order_type || 'direct';
    const paymentMethod = isSubscription(o) ? 'Subscription' : (o.payment_method || 'unknown');
    const paymentStatus = o.payment_status || '';
    const verificationStatus = o.payment_verification_status || 'not_required';
    const orderStatus = o.status || '';
    const pickupSlot = o.expected_pickup_slot || 'Not Provided';
    const notesStr = formatNotes(o.notes);

    for (const item of items) {
      const mealName = item.meal_name || meals[item.meal_id]?.name || '';
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const itemTotal = Number(item.total_price !== undefined && item.total_price !== null ? item.total_price : (quantity * unitPrice));
      const creditsUsed = isSubscription(o) ? Number(item.credits_used || quantity || 0) : 0;
      const subPlan = item.subscription_id ? getPlanNameForSub(item.subscription_id, dataset) : 'N/A';
      const subId = item.subscription_id || 'N/A';

      rows.push([
        o.order_number || '',
        serviceDate,
        dayName,
        orderCreatedAt,
        customerName,
        customerEmail,
        customerPhone,
        mealName,
        Number(quantity),
        Number(unitPrice),
        Number(itemTotal),
        Number(creditsUsed),
        orderType,
        paymentMethod,
        paymentStatus,
        verificationStatus,
        orderStatus,
        pickupSlot,
        subPlan,
        subId,
        notesStr,
      ]);
    }
  }

  return rows;
};

export const buildSubscriptionCustomersSheetData = (dataset: any) => {
  const { subscriptions = [], customers = {}, purchaseRequests = [] } = dataset;
  const rows: any[][] = [
    [
      'Customer Name',
      'Email',
      'Phone',
      'Plan Name',
      'Subscription Status',
      'Start Date',
      'End Date',
      'Total Credits',
      'Consumed Credits',
      'Remaining Credits',
      'Credits Per Day',
      'Purchase Price',
      'Payment Amount',
      'Currency',
      'Approved At',
      'Created At',
    ],
  ];

  for (const sub of subscriptions) {
    const user = customers[sub.user_id] || {};
    const req = (purchaseRequests || []).find(
      (r: any) => r.created_subscription_id === sub.id || (r.user_id === sub.user_id && r.status === 'approved')
    ) || {};

    const customerName = user.name || 'Unknown';
    const email = user.email || 'N/A';
    const phone = user.phone || 'N/A';
    const planName = sub.plan_name || req.plan_name_snapshot || 'Plus Plan';
    const subscriptionStatus = sub.status || '';
    const startDate = sub.start_date || '';
    const endDate = sub.end_date || '';
    const totalCredits = Number(sub.total_meals || req.total_meals_snapshot || 0);
    const consumedCredits = Number(sub.consumed_meals || 0);
    const remainingCredits = Number(sub.remaining_meals || 0);
    const creditsPerDay = Number(sub.meals_per_day || req.meals_per_day_snapshot || 0);
    const purchasePrice = Number(sub.purchase_price || req.base_amount_snapshot || 0);
    const paymentAmount = Number(req.expected_amount || sub.purchase_price || req.base_amount_snapshot || 0);
    const currency = sub.currency || req.currency_snapshot || 'INR';
    const approvedAt = toIST(req.approved_at || req.updated_at || sub.created_at);
    const createdAt = toIST(sub.created_at);

    rows.push([
      customerName,
      email,
      phone,
      planName,
      subscriptionStatus,
      startDate,
      endDate,
      Number(totalCredits),
      Number(consumedCredits),
      Number(remainingCredits),
      Number(creditsPerDay),
      Number(purchasePrice),
      Number(paymentAmount),
      currency,
      approvedAt,
      createdAt,
    ]);
  }

  return rows;
};

export const buildWalkInSalesSheetData = (dataset: any) => {
  const { walkInMovements = [], inventoryBatches = {}, meals = {}, customers = {} } = dataset;
  const rows: any[][] = [
    [
      'Sale Date',
      'Day',
      'Sale Time',
      'Meal',
      'Quantity',
      'Unit Price',
      'Total Amount',
      'Payment Method',
      'Operator',
      'Inventory Batch',
      'Notes',
    ],
  ];

  for (const m of walkInMovements) {
    const batch = inventoryBatches[m.inventory_batch_id] || {};
    const meal = meals[m.meal_id] || {};
    const operator = customers[m.created_by] || {};

    const saleDate = batch.inventory_date || (m.created_at ? String(m.created_at).slice(0, 10) : '');
    const dayName = getDayName(saleDate);
    const saleTime = toIST(m.created_at);
    const mealName = meal.name || 'Unknown Meal';
    const quantity = Number(m.quantity || 0);
    const unitPrice = Number(
      m.unit_price !== undefined && m.unit_price !== null ? m.unit_price : (meal.price || 0)
    );
    const totalAmount = Number(quantity * unitPrice);
    const paymentMethod = m.payment_method || 'cash';
    const operatorName = operator.name || operator.email || m.created_by || 'Unknown Operator';
    const batchLabel = batch.inventory_date
      ? `${batch.inventory_date} (${batch.window_start || ''}-${batch.window_end || ''})`
      : (m.inventory_batch_id || 'Unknown Batch');
    const notesStr = m.note || '';

    rows.push([
      saleDate,
      dayName,
      saleTime,
      mealName,
      Number(quantity),
      Number(unitPrice),
      Number(totalAmount),
      paymentMethod,
      operatorName,
      batchLabel,
      notesStr,
    ]);
  }

  return rows;
};

export const buildOrdersSheetData = (dataset: any) => buildCustomerOrderDetailsSheetData(dataset);
export const buildOrderItemsSheetData = (dataset: any) => buildCustomerOrderDetailsSheetData(dataset);
export const buildSummarySheetData = (dataset: any) => buildDayWiseSummarySheetData(dataset);

export const generateXlsxBase64 = (dataset: any, _fromDate: string, _toDate: string) => {
  const wb = XLSX.utils.book_new();

  const applyAutofilter = (ws: XLSX.WorkSheet) => {
    if (ws['!ref']) {
      ws['!autofilter'] = { ref: ws['!ref'] };
    }
  };

  const wsDayWiseData = buildDayWiseSummarySheetData(dataset);
  const wsCustomerOrdersData = buildCustomerOrderDetailsSheetData(dataset);
  const wsSubCustomersData = buildSubscriptionCustomersSheetData(dataset);
  const wsWalkInData = buildWalkInSalesSheetData(dataset);

  console.log('[EXPORT REAL DATA COUNTS]', {
    orders: dataset.orders?.length || 0,
    orderItems: dataset.orderItems?.length || 0,
    subscriptions: dataset.subscriptions?.length || 0,
    walkInMovements: dataset.walkInMovements?.length || 0,
    customerRows: Math.max(0, wsCustomerOrdersData.length - 1),
    summaryRows: Math.max(0, wsDayWiseData.length - 1),
  });

  const wsDayWise = XLSX.utils.aoa_to_sheet(wsDayWiseData);
  wsDayWise['!cols'] = [
    { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 18 },
  ];
  applyAutofilter(wsDayWise);
  XLSX.utils.book_append_sheet(wb, wsDayWise, 'Day Wise Summary');

  const wsCustomerOrders = XLSX.utils.aoa_to_sheet(wsCustomerOrdersData);
  wsCustomerOrders['!cols'] = Array(21).fill({ wch: 20 });
  applyAutofilter(wsCustomerOrders);
  XLSX.utils.book_append_sheet(wb, wsCustomerOrders, 'Customer Order Details');

  const wsSubCustomers = XLSX.utils.aoa_to_sheet(wsSubCustomersData);
  wsSubCustomers['!cols'] = Array(16).fill({ wch: 20 });
  applyAutofilter(wsSubCustomers);
  XLSX.utils.book_append_sheet(wb, wsSubCustomers, 'Subscription Customers');

  const wsWalkIn = XLSX.utils.aoa_to_sheet(wsWalkInData);
  wsWalkIn['!cols'] = Array(11).fill({ wch: 20 });
  applyAutofilter(wsWalkIn);
  XLSX.utils.book_append_sheet(wb, wsWalkIn, 'Walk-in Sales');

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
