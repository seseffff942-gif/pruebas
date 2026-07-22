import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = 'https://placeholder.supabase.co';
const supabaseKey = 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);
async function test() {
  const { data, error } = await supabase.storage.createBucket('productos', { public: true });
  console.log('Create Bucket:', data, error);
}
test();
