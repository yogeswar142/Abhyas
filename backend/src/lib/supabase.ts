import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Admin client — uses service role key for auth validation (getUser, etc.).
 * Never expose to the frontend. Used only in backend middleware.
 */
export function getAdminSupabaseClient() {
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');
  const key = serviceRoleKey || anonKey;
  if (!key) throw new Error('No Supabase key configured (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)');
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * User-scoped client — uses the user's JWT token for RLS-enforced queries.
 * Use this for all database operations that should respect Row Level Security.
 */
export function getSupabaseClient(jwtToken?: string) {
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');
  const key = serviceRoleKey || anonKey;
  if (!key) throw new Error('No Supabase key configured');

  if (jwtToken) {
    return createClient(supabaseUrl, key, {
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
