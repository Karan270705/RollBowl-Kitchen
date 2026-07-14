require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testQuery() {
  const { data, error } = await supabase.rpc('activate_inventory_batch', { p_batch_id: '00000000-0000-0000-0000-000000000000' });
  console.log(JSON.stringify({ data, error }, null, 2));
}
testQuery();
