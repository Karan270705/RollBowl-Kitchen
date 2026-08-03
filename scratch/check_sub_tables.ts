import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL || '', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '');

async function main() {
  const { data: inv, error: errInv } = await supabase.from('inventory_movements').select('id, movement_type, quantity, unit_price, payment_method').limit(1);
  console.log('inventory_movements test query:', inv, errInv?.message || 'success');
}
main();
