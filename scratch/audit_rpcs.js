require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function audit() {
  const { data, error } = await supabase.rpc('get_function_def', { func_name: 'activate_inventory_batch' });
  console.log('activate_inventory_batch:', data, error);
  const { data: d2, error: e2 } = await supabase.rpc('get_function_def', { func_name: 'place_order' });
  console.log('place_order:', d2, e2);
}
audit();
