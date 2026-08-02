const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xhyojkqsgpvjctmdqxzq.supabase.co';
const supabaseKey = 'sb_publishable_DHsHOnpcix8PRVuIt3BqIA_A1uq-YQG';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const stallId = '57a11000-0000-0000-0000-000000000001';
  const date = '2026-08-01';

  console.log('Testing fetchWalkInSales query...');
  const { data, error } = await supabase
    .from('inventory_movements')
    .select(`
      id,
      inventory_batch_item_id,
      inventory_batch_id,
      meal_id,
      movement_type,
      quantity,
      unit_price,
      payment_method,
      note,
      created_by,
      created_at,
      inventory_batch_items!inner (
        meal_id,
        meals!inner (
          name,
          price
        )
      ),
      inventory_batches!inner (
        stall_id,
        inventory_date
      ),
      users:created_by (
        name
      )
    `)
    .eq('movement_type', 'walk_in_sale')
    .eq('inventory_batches.stall_id', stallId)
    .eq('inventory_batches.inventory_date', date)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS, count:', data?.length);
    console.log(JSON.stringify(data, null, 2));
  }
}

testQuery();
