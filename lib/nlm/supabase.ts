import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  console.log('Initializing Supabase client with URL:', supabaseUrl);
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
}

export const supabase = supabaseInstance;
