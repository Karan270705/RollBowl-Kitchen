const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xhyojkqsgpvjctmdqxzq.supabase.co';
const supabaseKey = 'sb_publishable_DHsHOnpcix8PRVuIt3BqIA_A1uq-YQG';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMenu() {
  const stallId = 'f8491991-cba0-4c72-977d-0a9fc1bb36bd';
  const serviceDate = '2026-09-27';
  
  const { data, error } = await supabase
    .from('menu_schedules')
    .select('*')
    .eq('stall_id', stallId)
    .eq('menu_date', serviceDate);
    
  console.log('Result:', JSON.stringify({ data, error }, null, 2));
}

checkMenu();
