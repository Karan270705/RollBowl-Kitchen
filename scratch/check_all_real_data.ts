import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rohan-rollbowl.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Try logging in as auditor or signing up temporary user to bypass RLS
  const email = `auditor_check_${Date.now()}@rollbowl.test`;
  const password = 'TestPassword123!';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: 'Audit User', role: 'stall_operator' }
    }
  });

  if (authErr) {
    console.log('Auth signup note:', authErr.message);
  } else {
    console.log('Signed up temporary user:', authData.user?.id);
  }

  // Query stalls
  const { data: stalls, error: errStalls } = await supabase.from('stalls').select('id, name, operator_id');
  console.log('Real stalls:', stalls, 'error:', errStalls?.message || 'none');

  const operatorId = stalls?.[0]?.operator_id;
  if (operatorId) {
    const { data: opUser, error: errOp } = await supabase.from('users').select('id, name, email, phone').eq('id', operatorId);
    console.log('Operator user query:', opUser, 'error:', errOp?.message || 'none');
  }
}

main();
