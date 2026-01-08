import { createClient } from "@supabase/supabase-js";

// ⚠️ HARD-CODED OVERRIDE: Connecting strictly to the 'content-cms' project (ddxh...)
const supabaseUrl = "https://ddxhhotymwaemmcmxmhj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGhob3R5bXdhZW1tY214bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjA2MDEsImV4cCI6MjA4MzAzNjYwMX0.yEaYVJSXTuul_SNK28EpK3dyfkmIKd6tX4xd6BktRXY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);