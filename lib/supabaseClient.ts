import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, these should be environment variables.
// Users must provide these to connect to their backend.
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// To prevent the app from crashing if env vars are missing (Uncaught Error: supabaseUrl is required),
// we use a valid-looking placeholder. 
// The isSupabaseConfigured() check prevents the app from actually trying to use this invalid client.
const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey && envKey.length > 0 ? envKey : 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
    return !!envUrl && envUrl.length > 0 && !!envKey && envKey.length > 0;
};