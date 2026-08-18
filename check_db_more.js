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

async function checkMoreDB() {
  const tables = ['plots', 'harvest_records', 'spta_tickets', 'truck_dispatches', 'sugar_mills'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Error on ${table}:`, error.message);
    } else {
      console.log(`Table ${table} columns:`, data.length > 0 ? Object.keys(data[0]) : "No data, but table exists.");
      if (data.length > 0) {
        console.log(`Sample ${table}:`, data[0]);
      }
    }
  }
}

checkMoreDB();
