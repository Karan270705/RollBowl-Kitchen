import { 
  buildDayWiseSummarySheetData, 
  buildCustomerOrderDetailsSheetData, 
  buildSubscriptionCustomersSheetData, 
  buildWalkInSalesSheetData 
} from '../src/services/reports/orderExport';

const sampleDataset = {
  orders: [
    {
      id: 'o1',
      order_number: 'RB-101',
      pickup_date: '2026-08-03',
      created_at: '2026-08-03T10:00:00Z',
      user_id: 'u1',
      order_type: 'direct',
      payment_method: 'cash',
      payment_status: 'paid',
      total: 120,
      status: 'completed',
    },
    {
      id: 'o2',
      order_number: 'RB-102',
      pickup_date: '2026-08-03',
      created_at: '2026-08-03T10:15:00Z',
      user_id: 'u2',
      order_type: 'subscription',
      payment_method: 'subscription',
      payment_status: 'paid',
      total: 0,
      status: 'completed',
    },
    {
      id: 'o3',
      order_number: 'RB-103',
      pickup_date: '2026-08-03',
      created_at: '2026-08-03T10:30:00Z',
      user_id: 'u1',
      order_type: 'direct',
      payment_method: 'upi',
      payment_status: 'paid',
      total: 200,
      status: 'cancelled', // Should be excluded
    },
    {
      id: 'o4',
      order_number: 'RB-104',
      pickup_date: '2026-08-03',
      created_at: '2026-08-03T11:00:00Z',
      user_id: null,
      order_type: 'walk_in',
      payment_method: 'walk_in',
      payment_status: 'paid',
      total: 60,
      status: 'completed',
    },
  ],
  orderItems: [
    { order_id: 'o1', quantity: 2, meal_name: 'Roll' },
    { order_id: 'o2', quantity: 2, meal_name: 'Bowl', credits_used: 2, subscription_id: 'sub1' },
    { order_id: 'o3', quantity: 5, meal_name: 'Combo' },
    { order_id: 'o4', quantity: 1, meal_name: 'Roll' },
  ],
  customers: {
    u1: { name: 'Karan', phone: '1111111111', email: 'karan@test.com' },
    u2: { name: 'Pooja', phone: '2222222222', email: 'pooja@test.com' },
  },
  subscriptions: [
    {
      user_id: 'u2',
      plan_name: 'Plus Plan',
      total_meals: 40,
      meals_per_day: 2,
      remaining_meals: 38,
      status: 'active',
      start_date: '2026-08-01',
      end_date: '2026-08-25',
    }
  ]
};

function runTest() {
  console.log('=== VERIFYING PATCHED EXPORT LOGIC ===');
  
  const dayWise = buildDayWiseSummarySheetData(sampleDataset);
  console.log('\n--- Day Wise Summary ---');
  console.table(dayWise);

  const customerOrders = buildCustomerOrderDetailsSheetData(sampleDataset);
  console.log('\n--- Customer Order Details ---');
  console.table(customerOrders);

  const subCustomers = buildSubscriptionCustomersSheetData(sampleDataset);
  console.log('\n--- Subscription Customers ---');
  console.table(subCustomers);

  const walkInSales = buildWalkInSalesSheetData(sampleDataset);
  console.log('\n--- Walk-in Sales ---');
  console.table(walkInSales);

  // Assertion checks
  const totalCustomerQtyInDayWise = dayWise[1][4] - walkInSales[1][6]; // Total items sold minus walk-in items
  const totalQtyInCustomerOrders = customerOrders.slice(1).reduce((sum, r) => sum + r[10], 0);
  console.log(`\nReconciliation check: Customer Qty in Day Wise (${totalCustomerQtyInDayWise}) === Customer Qty in Customer Order Details (${totalQtyInCustomerOrders}):`, totalCustomerQtyInDayWise === totalQtyInCustomerOrders ? '✅ PASS' : '❌ FAIL');
  
  const hasCancelled = customerOrders.some(r => r[1] === 'RB-103');
  console.log('Cancelled orders excluded by default:', !hasCancelled ? '✅ PASS' : '❌ FAIL');

  const walkInInCustomerOrders = customerOrders.some(r => r[1] === 'RB-104');
  console.log('Walk-in sales excluded from Customer Order Details:', !walkInInCustomerOrders ? '✅ PASS' : '❌ FAIL');

  const subRow = customerOrders.find(r => r[1] === 'RB-102');
  console.log('Subscription order shows Payment Method = Subscription, Item Total = 0, Credits Used = 2:', (subRow?.[8] === 'Subscription' && subRow?.[11] === 0 && subRow?.[12] === 2) ? '✅ PASS' : '❌ FAIL');

  const plusSubRow = subCustomers[1];
  console.log('Plus Plan shows DB total credits (40) & credits/day (2):', (plusSubRow?.[4] === 40 && plusSubRow?.[5] === 2) ? '✅ PASS' : '❌ FAIL');
}

runTest();
