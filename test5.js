import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://placeholder.supabase.co';
const supabaseKey = 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('products').select('*');
  let extSum = 0;
  data.forEach(p => {
    if (p.is_external) {
      const pStock = p.stock || 0;
      const pPrice = p.price || 0;
      if (pStock > 0) extSum += pStock * pPrice;
    }
  });
  console.log("External sum:", extSum);
}
run();
