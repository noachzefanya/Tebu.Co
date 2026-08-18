import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkInfoSchema() {
  const { data, error } = await supabase.from('information_schema.columns').select('*').eq('table_name', 'profiles').limit(1);
  if (error) {
    console.log("Cannot query information_schema:", error.message);
  } else {
    console.log("Can query information_schema! Result:", data);
  }
}

checkInfoSchema();
