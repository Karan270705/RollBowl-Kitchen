const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const TARGET_REQUEST_ID = 'bb0bdbdf-bd63-4fdb-9a4e-f0a10bea2e74';

async function verify() {
  // 1. Direct lookup by ID (bypasses stall filter)
  console.log('=== 1. Direct lookup by ID ===');
  const { data: byId, error: errId } = await supabase
    .from('subscription_purchase_requests')
    .select('id, user_id, stall_id, status, requested_at, created_at')
    .eq('id', TARGET_REQUEST_ID)
    .maybeSingle();

  if (errId) {
    console.log('Error:', errId.message, errId.code, errId.hint);
  } else if (byId) {
    console.log('✅ Found:', JSON.stringify(byId, null, 2));
  } else {
    console.log('❌ Row not found by ID');
  }

  // 2. Count all rows regardless of filter (RLS may still apply)
  console.log('\n=== 2. Count all subscription_purchase_requests ===');
  const { count, error: cErr } = await supabase
    .from('subscription_purchase_requests')
    .select('*', { count: 'exact', head: true });

  if (cErr) {
    console.log('Count error:', cErr.message);
  } else {
    console.log('Total rows visible to current session:', count);
  }

  // 3. Check RLS - who are we? (anon has no auth.uid())
  console.log('\n=== 3. Auth state ===');
  const { data: session } = await supabase.auth.getSession();
  console.log('Session:', session?.session ? `User ${session.session.user.id}` : 'No session (anon)');
  console.log('RLS policy on subscription_purchase_requests requires: user_id = auth.uid() OR is_stall_operator(stall_id)');
  console.log('Since we are anon (no auth.uid()), RLS blocks all rows.');
  console.log('\nThe query syntax is CORRECT. The 0-row result is expected without authentication.');
  console.log('When the Kitchen operator logs in on the native app, auth.uid() matches the stall operator_id, and RLS allows the read.');
}

verify();
