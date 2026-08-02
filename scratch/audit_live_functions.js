const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing RPC calls and checking live schema...');
  
  // Try calling place_order or checking existing RPCs
  const { data, error } = await supabase.rpc('exec_sql', { sql: "SELECT proname FROM pg_proc WHERE proname IN ('place_order', 'accept_order', 'update_order_status');" });
  if (error) {
    console.log('exec_sql RPC not available:', error.message);
  } else {
    console.log('exec_sql result:', data);
  }
}

test();
