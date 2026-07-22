import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');

async function check() {
  const { data, error } = await supabase.from('office_inventory').select('*');
  console.log('Total items:', data?.length);
  console.log(data);
}
check();
