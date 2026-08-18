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

async function checkRLS() {
  console.log("Checking RLS by attempting anonymous read and write...");

  // Try to read profiles anonymously
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(5);
  if (pErr) {
    console.log("Anonymous Read Profiles: BLOCKED (Good!) -", pErr.message);
  } else {
    console.log(`Anonymous Read Profiles: ALLOWED (Security Risk!) - Found ${profiles.length} profiles.`);
  }

  // Try to read plots anonymously
  const { data: plots, error: plotErr } = await supabase.from('plots').select('*').limit(5);
  if (plotErr) {
    console.log("Anonymous Read Plots: BLOCKED (Good!) -", plotErr.message);
  } else {
    console.log(`Anonymous Read Plots: ALLOWED (Security Risk!) - Found ${plots.length} plots.`);
  }

  // Try to read spta_tickets
  const { data: tickets, error: ticketErr } = await supabase.from('spta_tickets').select('*').limit(5);
  if (ticketErr) {
    console.log("Anonymous Read Tickets: BLOCKED (Good!) -", ticketErr.message);
  } else {
    console.log(`Anonymous Read Tickets: ALLOWED (Security Risk!) - Found ${tickets.length} tickets.`);
  }
}

checkRLS();
