const { createClient } = require('../node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://xhyojkqsgpvjctmdqxzq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DHsHOnpcix8PRVuIt3BqIA_A1uq-YQG';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectOrders() {
  console.log('Signing up temporary auth user...');
  const email = `inspector_${Date.now()}@rollbowl.test`;
  await supabase.auth.signUp({
    email,
    password: 'TestPassword123!',
    options: { data: { name: 'Inspector', phone: '9999999999' } }
  });

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, notes, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Fetched ${orders?.length || 0} orders:`);
  for (const o of (orders || [])) {
    console.log(`- [${o.order_number}] (id: ${o.id}) notes: ${JSON.stringify(o.notes)}`);
  }

  // Filter in javascript
  const testOrders = (orders || []).filter(o => 
    o.order_number === 'RB-001040' || 
    o.order_number === 'RB-001041' || 
    (o.notes && o.notes.includes('Issue #5'))
  );

  console.log(`Found ${testOrders.length} test orders to delete:`, testOrders.map(o => o.order_number));

  if (testOrders.length > 0) {
    const ids = testOrders.map(o => o.id);
    await supabase.from('order_items').delete().in('order_id', ids);
    const { error: delErr } = await supabase.from('orders').delete().in('id', ids);
    if (delErr) {
      console.error('Delete error:', delErr);
    } else {
      console.log('✅ Deleted test orders:', testOrders.map(o => o.order_number));
    }
  }
}

inspectOrders();
