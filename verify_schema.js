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

async function verifySchemaAndConstraints() {
  console.log("Verifying schemas by test insertions...");

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id').limit(1);
  const farmerId = profiles && profiles.length > 0 ? profiles[0].id : '00000000-0000-0000-0000-000000000000';
  
  const plotPayload = {
    farmer_id: farmerId,
    farmer_name: 'Test',
    plot_code: 'TEST-1',
    plot_name: 'TEST-1',
    area_ha: 10,
    estimated_yield_tons: 10,
    est_tonnage: 10,
    sugar_cane_variety: 'BL',
    variety: 'BL',
    sugar_mill_target: 'PG',
    status: 'AKTIF'
  };

  const { data: plotData, error: plotErr } = await supabase.from('plots').insert([plotPayload]).select();
  if (plotErr) {
    console.error("Plots Insert Error:", plotErr.message);
    return;
  }
  console.log("Plots inserted successfully. Columns:", Object.keys(plotData[0]));

  const harvestPayload = {
    farmer_id: farmerId,
    farmer_name: 'Test',
    plot_id: plotData[0].id,
    sugar_mill: 'PG',
    mill_name: 'PG',
    total_weight_tons: 10,
    total_tonnage: 10,
    total_trucks: 1,
    truck_count: 1,
    status: 'TERJADWAL'
  };

  const { data: harvestData, error: harvestErr } = await supabase.from('harvest_records').insert([harvestPayload]).select();
  if (harvestErr) {
    console.error("Harvest Records Insert Error:", harvestErr.message);
  } else {
    console.log("Harvest Records inserted successfully. Columns:", Object.keys(harvestData[0]));
  }

  // To test spta_tickets without the missing columns:
  const ticketPayload = {
    harvest_id: harvestData ? harvestData[0].id : null,
    ticket_code: 'TEST-TICKET',
    spta_code: 'TEST-TICKET',
    truck_number: 'N 1234',
    plate_number: 'N 1234',
    driver_name: 'Budi',
    net_weight_kg: 10000,
    tonnage: 10,
    scheduled_slot: new Date().toISOString(),
    status: 'TERJADWAL',
    // batch_id: harvestData ? harvestData[0].id : null,
    // spta_ticket: 'TEST-TICKET'
  };

  const { data: ticketData, error: ticketErr } = await supabase.from('spta_tickets').insert([ticketPayload]).select();
  if (ticketErr) {
    console.error("SPTA Tickets Insert Error:", ticketErr.message);
  } else {
    console.log("SPTA Tickets inserted successfully. Columns:", Object.keys(ticketData[0]));
  }

  // Rollback everything
  if (ticketData) await supabase.from('spta_tickets').delete().eq('id', ticketData[0].id);
  if (harvestData) await supabase.from('harvest_records').delete().eq('id', harvestData[0].id);
  if (plotData) await supabase.from('plots').delete().eq('id', plotData[0].id);
}

verifySchemaAndConstraints();
