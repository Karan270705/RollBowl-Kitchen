require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const email = `op_test_${Date.now()}@rollbowl.test`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'TestPassword123!',
    options: { data: { name: 'Test Operator' } }
  });
  console.log('Signed up:', authData.user?.id, authErr?.message);

  const { error: upErr } = await supabase
    .from('users')
    .update({ role: 'stall_operator' })
    .eq('id', authData.user.id);
  console.log('Updated role to stall_operator, error:', upErr?.message || 'none');

  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, email, name, role')
    .limit(10);
  console.log('Users found:', users?.length, 'error:', uErr?.message || 'none');
  if (users) {
    const mainOp = users.find(u => u.id === '46fb07f7-338a-4131-a980-18a74f463c5c');
    console.log('Main stall operator 46fb07f7-338a-4131-a980-18a74f463c5c found:', mainOp);
  }
}

test();
