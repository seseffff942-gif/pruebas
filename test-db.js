import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const envUrl = process.env.SUPABASE_URL;
const supabaseUrl = envUrl && envUrl.startsWith('http') ? envUrl : 'https://placeholder.supabase.co';
const envKey = process.env.SUPABASE_ANON_KEY;
const supabaseKey = envKey && envKey.length > 10 ? envKey : 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('office_inventory').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
