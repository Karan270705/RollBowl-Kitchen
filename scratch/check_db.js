import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL || '', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '');

async function main() {
  const { data: stalls, error: e1 } = await supabase.from('stalls').select('id, name');
  console.log('Stalls:', stalls?.length, e1?.message || '');

  const { data: meals, error: e2 } = await supabase.from('meals').select('id, name');
  console.log('Meals:', meals?.length, e2?.message || '');

  const { data: orders, error: e3 } = await supabase.from('orders').select('id');
  console.log('Orders (anon):', orders?.length, e3?.message || '');
}
main();
