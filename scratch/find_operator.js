import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL || '', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '');

async function find() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role');
  console.log('users:', data, error);

  const { data: stalls } = await supabase
    .from('stalls')
    .select('*');
  console.log('stalls:', stalls);
}

find();
