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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
  console.log("Checking tables...");
  
  // 1. Check profiles
  const { data: profiles, error: profileErr } = await supabase.from('profiles').select('*').limit(1);
  if (profileErr) {
    console.error("Error fetching profiles:", profileErr);
  } else {
    console.log("Profiles columns:", profiles.length > 0 ? Object.keys(profiles[0]) : "No data in profiles");
    if (profiles.length > 0) {
      console.log("Sample profile:", profiles[0]);
    }
  }

  // 2. Check farmers
  const { data: farmers, error: farmerErr } = await supabase.from('farmers').select('*').limit(1);
  if (farmerErr) {
    console.log("Farmers table might not exist or error:", farmerErr.message);
  } else {
    console.log("Farmers table exists. Sample:", farmers.length > 0 ? Object.keys(farmers[0]) : "Empty");
  }

  // 3. Check harvest_batches
  const { data: hBatches, error: hBatchesErr } = await supabase.from('harvest_batches').select('*').limit(1);
  if (hBatchesErr) console.log("harvest_batches error:", hBatchesErr.message);
  else console.log("harvest_batches exists");

  // 4. Check sugarcane_plots
  const { data: sPlots, error: sPlotsErr } = await supabase.from('sugarcane_plots').select('*').limit(1);
  if (sPlotsErr) console.log("sugarcane_plots error:", sPlotsErr.message);
  else console.log("sugarcane_plots exists");
  
  // 5. Check plots
  const { data: plots, error: plotsErr } = await supabase.from('plots').select('*').limit(1);
  if (plotsErr) console.log("plots error:", plotsErr.message);
  else console.log("plots exists");
}

checkDB();
