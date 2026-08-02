import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient(jwtToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (jwtToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
