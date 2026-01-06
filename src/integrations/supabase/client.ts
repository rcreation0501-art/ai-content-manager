import { createClient } from '@supabase/supabase-js';

// Get env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log warning if missing
if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase keys are missing! App loading in fallback mode.");
}

// Create client with fallback values to prevent crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);