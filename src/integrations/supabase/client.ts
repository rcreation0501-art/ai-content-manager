import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log a clear warning if keys are missing
if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase keys are missing! The app will load in preview mode.");
}

// Fallback to prevent crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);