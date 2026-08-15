import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials missing! Falling back to offline/mock mode.");
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseUrl.length > 5 && supabaseAnonKey && supabaseAnonKey.length > 5);

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');