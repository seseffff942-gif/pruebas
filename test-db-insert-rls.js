import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');

async function test() {
  const { data, error } = await supabase.from('office_inventory').insert([
    {
      name: 'Test RLS',
      category: 'Test',
      quantity: 1,
      unit_price: 10,
      location: 'Test',
      status: 'good'
    }
  ]).select().single();
  console.log('Error:', error);
}
test();
