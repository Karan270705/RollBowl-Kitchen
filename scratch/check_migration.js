// Run migration: Add payment_method and unit_price columns to inventory_movements
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xhyojkqsgpvjctmdqxzq.supabase.co';
const supabaseKey = 'sb_publishable_DHsHOnpcix8PRVuIt3BqIA_A1uq-YQG';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  // Use rpc to run raw SQL - this requires the pg_net or a custom function
  // Instead, let's use the REST API to verify the columns exist by trying an insert/select
  
  // First, let's check if columns already exist by querying
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('payment_method, unit_price')
    .limit(1);
  
  if (error) {
    console.log('Columns do NOT exist yet. Error:', error.message);
    console.log('\n⚠️  Please run the following SQL in your Supabase Dashboard SQL Editor:\n');
    console.log(`
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS unit_price numeric;

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS chk_payment_method;

ALTER TABLE inventory_movements
  ADD CONSTRAINT chk_payment_method 
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'upi'));
    `);
  } else {
    console.log('✅ Columns payment_method and unit_price already exist!');
    console.log('Sample data:', data);
  }
}

runMigration().catch(console.error);
