require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: stalls } = await supabase.from('stalls').select('id, name').limit(1);
  const sid = stalls[0].id;
  
  const { data, error } = await supabase
    .from('meals')
    .select('id, name, category, is_available')
    .eq('stall_id', sid)
    .eq('is_available', true);
    
  console.log('Meals for stall:', sid);
  console.log('Total count:', data.length);
  
  // Just dump the list of meals
  data.forEach(m => console.log(m.id, m.name));
}
run();
