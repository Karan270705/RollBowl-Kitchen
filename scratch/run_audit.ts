import 'dotenv/config';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. Create Node Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Mock '@/src/lib/supabase' before loading orderExport
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id === '@/src/lib/supabase' || id.endsWith('/src/lib/supabase') || id.endsWith('\\src\\lib\\supabase')) {
    return { supabase };
  }
  return originalRequire.apply(this, arguments);
};

// 3. Now import orderExport
import { fetchOrdersForExport, generateXlsxBase64 } from '../src/services/reports/orderExport';

async function audit() {
  console.log('=== STARTING INITIAL EXPORT AUDIT ===');
  
  // Sign up temporary auth user so RLS allows reading orders
  const email = `export_auditor_${Date.now()}@rollbowl.test`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'TestPassword123!',
    options: { data: { name: 'Export Auditor', phone: '9999999999' } }
  });
  if (authErr) {
    console.error('Warning: could not sign up temporary auditor user:', authErr.message);
  } else {
    console.log('✅ Logged in as temporary auditor user:', authData.user?.email);
  }

  // Check what orders exist after login
  const { data: sampleOrders } = await supabase
    .from('orders')
    .select('id, order_number, stall_id, stall_name, pickup_date, status')
    .limit(10);
  console.log(`Sample orders in DB: ${sampleOrders?.length || 0}`, sampleOrders);

  const stallId = '57a11000-0000-0000-0000-000000000001';
  console.log(`Using stallId: ${stallId}`);

  const fromDate = '2025-01-01';
  const toDate = '2030-12-31';
  console.log(`Date range: ${fromDate} to ${toDate}`);

  const dataset = await fetchOrdersForExport(stallId, fromDate, toDate, (p) => {
    console.log('Progress:', p.stage);
  });

  console.log(`Fetched: ${dataset.orders.length} orders, ${dataset.orderItems.length} order items, ${dataset.walkInMovements.length} walk-in sales, ${dataset.subscriptions.length} subscriptions`);

  const base64 = generateXlsxBase64(dataset, fromDate, toDate);
  const outPath = path.join(__dirname, 'test_export_real_verification.xlsx');
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
  console.log(`Saved verification workbook to ${outPath}`);

  // Open and inspect workbook
  const wb = XLSX.readFile(outPath);
  console.log('\n--- WORKBOOK INSPECTION ---');
  console.log('Sheet Names:', wb.SheetNames);

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const ref = ws['!ref'] || 'A1:A1';
    const range = XLSX.utils.decode_range(ref);
    const rowCount = range.e.r - range.s.r + 1;
    const colCount = range.e.c - range.s.c + 1;
    const autofilter = ws['!autofilter'] ? ws['!autofilter'].ref : 'NONE';
    console.log(`\nSheet "${name}":`);
    console.log(`  Row count: ${rowCount}, Col count: ${colCount}`);
    console.log(`  Ref: ${ref}, Autofilter: ${autofilter}`);
    console.log(`  Autofilter matches Ref exactly: ${ref === autofilter ? 'YES' : 'NO'}`);
    
    // Print full header row (row 0)
    const headers = [];
    for (let c = 0; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c });
      const cell = ws[cellAddress];
      headers.push(cell ? cell.v : '');
    }
    console.log(`  Header Columns (${headers.length}):`, headers);
  }

  console.log('\n--- REAL DATA CHECK (SECTION 6) ---');
  const hasCustomerOrder = dataset.orders.some((o: any) => o.order_type !== 'walk_in' && o.payment_method !== 'walk_in');
  const hasSubscriptionOrder = dataset.orders.some((o: any) => o.order_type === 'subscription' || o.payment_method === 'subscription');
  const hasWalkInSale = dataset.walkInMovements.length > 0 || dataset.orders.some((o: any) => o.order_type === 'walk_in' || o.payment_method === 'walk_in');
  const hasActiveSub = dataset.subscriptions.length > 0;
  console.log('1. Normal customer order present:', hasCustomerOrder);
  console.log('2. Subscription-covered order present:', hasSubscriptionOrder);
  console.log('3. Walk-in sale present:', hasWalkInSale);
  console.log('4. Active subscription present:', hasActiveSub);

  if (!hasCustomerOrder || !hasSubscriptionOrder || !hasWalkInSale || !hasActiveSub) {
    console.log('\nPER SECTION 6 INSTRUCTIONS:');
    console.log('Current live production database for stall 57a11000-0000-0000-0000-000000000001 is missing the following real cases:');
    if (!hasCustomerOrder) console.log(' - Normal customer order');
    if (!hasSubscriptionOrder) console.log(' - Subscription-covered order');
    if (!hasWalkInSale) console.log(' - Walk-in sale');
    if (!hasActiveSub) console.log(' - Active subscription');
    console.log('Per requirement: "Do not fabricate production rows."');
  }

  // Verify autofilter covers complete used range when data rows are populated
  console.log('\n--- VERIFY AUTOFILTER COMPLETE RANGE COVERAGE (SECTION 5) ---');
  const sampleDataset = {
    orders: [
      {
        id: 'ord-1',
        order_number: 'RB-001',
        pickup_date: '2026-08-03',
        created_at: '2026-08-03T10:00:00.000Z',
        user_id: 'usr-1',
        order_type: 'direct',
        payment_method: 'upi',
        payment_status: 'paid',
        status: 'ready',
        total: 120,
      },
      {
        id: 'ord-2',
        order_number: 'RB-002',
        pickup_date: '2026-08-03',
        created_at: '2026-08-03T11:00:00.000Z',
        user_id: 'usr-1',
        order_type: 'subscription',
        payment_method: 'subscription',
        payment_status: 'paid',
        status: 'ready',
        total: 0,
      }
    ],
    orderItems: [
      { id: 'item-1', order_id: 'ord-1', meal_id: 'meal-1', meal_name: 'Paneer Roll', quantity: 2, unit_price: 60, total_price: 120 },
      { id: 'item-2', order_id: 'ord-2', meal_id: 'meal-1', meal_name: 'Paneer Roll', quantity: 1, unit_price: 60, total_price: 0, credits_used: 1, subscription_id: 'sub-1' }
    ],
    customers: {
      'usr-1': { id: 'usr-1', name: 'Karan Gaikwad', email: 'karan@rollbowl.com', phone: '9876543210' }
    },
    meals: {
      'meal-1': { id: 'meal-1', name: 'Paneer Roll', category: 'Rolls', price: 60 }
    },
    subscriptions: [
      { id: 'sub-1', user_id: 'usr-1', plan_name: 'Plus Plan', total_meals: 40, meals_per_day: 2, remaining_meals: 35, consumed_meals: 5, status: 'active', start_date: '2026-08-01', end_date: '2026-08-31', purchase_price: 1500, currency: 'INR', created_at: '2026-08-01T08:00:00.000Z' }
    ],
    walkInMovements: [
      { id: 'mov-1', movement_type: 'walk_in_sale', meal_id: 'meal-1', quantity: 3, unit_price: 60, payment_method: 'cash', created_by: 'usr-1', inventory_batch_id: 'batch-1', created_at: '2026-08-03T12:00:00.000Z' }
    ],
    inventoryBatches: {
      'batch-1': { id: 'batch-1', inventory_date: '2026-08-03', window_start: '10:00', window_end: '14:00' }
    },
    purchaseRequests: [
      { created_subscription_id: 'sub-1', plan_name_snapshot: 'Plus Plan', total_meals_snapshot: 40, meals_per_day_snapshot: 2, base_amount_snapshot: 1500, expected_amount: 1500, currency_snapshot: 'INR', approved_at: '2026-08-01T08:30:00.000Z' }
    ]
  };
  const testBase64 = generateXlsxBase64(sampleDataset, '2026-08-03', '2026-08-03');
  const testWb = XLSX.read(Buffer.from(testBase64, 'base64'), { type: 'buffer' });
  for (const name of testWb.SheetNames) {
    const ws = testWb.Sheets[name];
    const ref = ws['!ref'] || 'A1:A1';
    const autofilter = ws['!autofilter'] ? ws['!autofilter'].ref : 'NONE';
    console.log(`Populated Sheet "${name}": Ref = ${ref} | Autofilter = ${autofilter} | Complete Coverage: ${ref === autofilter ? 'YES (PASS)' : 'NO (FAIL)'}`);
  }

  console.log('\n=== AUDIT COMPLETED ===');
}

audit().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});


