import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');

async function test() {
  const { data, error } = await supabase.from('office_inventory').select('*').limit(1);
  console.log('Select:', { data, error });
}
test();
