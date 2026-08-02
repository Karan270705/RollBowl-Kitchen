const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testSelectQueries() {
  console.log('=== 1. TEST OLD SELECT (AMBIGUOUS USERS FK + REQUESTED_AT) ===');
  const oldQuery = `
      *,
      users ( name, email, phone, college_id ),
      subscription_plans ( name )
    `;
  const { data: oldData, error: oldError } = await supabase
    .from('subscription_purchase_requests')
    .select(oldQuery)
    .order('requested_at', { ascending: false });

  if (oldError) {
    console.log('[OLD QUERY ERROR]:', oldError.code, oldError.message);
  } else {
    console.log('[OLD QUERY SUCCEEDED]');
  }

  console.log('\n=== 2. TEST NEW EXPLICIT SELECT (DISAMBIGUATED FK + CREATED_AT) ===');
  const correctedSelect = `
    id,
    user_id,
    stall_id,
    plan_id,
    status,
    current_payment_proof_id,
    plan_name_snapshot,
    base_amount_snapshot,
    convenience_fee_percent_snapshot,
    convenience_fee_snapshot,
    expected_amount,
    currency_snapshot,
    total_meals_snapshot,
    duration_days_snapshot,
    meals_per_day_snapshot,
    category_credit_costs_snapshot,
    features_snapshot,
    approved_at,
    approved_by,
    rejected_at,
    rejection_reason,
    created_subscription_id,
    created_at,
    users!subscription_purchase_requests_user_id_fkey (
      name,
      email,
      phone,
      college_id
    ),
    subscription_plans (
      name
    )
  `.trim();

  const { data: newData, error: newError } = await supabase
    .from('subscription_purchase_requests')
    .select(correctedSelect)
    .order('created_at', { ascending: false });

  if (newError) {
    console.log('[NEW QUERY ERROR]:', newError.code, newError.message);
  } else {
    console.log('[NEW QUERY SUCCEEDED]: Error is null! PostgREST parsed select successfully. Rows count:', newData.length);
  }
}

testSelectQueries();
