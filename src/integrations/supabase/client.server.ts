// Server-side Supabase client.
// When SUPABASE_SERVICE_ROLE_KEY is available, uses service role (bypasses RLS).
// When NOT available (Lovable sandbox), falls back to anon key so the app renders.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

type AdminClient = SupabaseClient<Database>;

function createSupabaseAdminClient(): AdminClient {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_URL : undefined);

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY : undefined);

  const key = SERVICE_KEY || ANON_KEY;

  if (!SUPABASE_URL || !key) {
    throw new Error('[Supabase] Missing SUPABASE_URL or key. Check environment variables.');
  }

  if (!SERVICE_KEY) {
    console.warn('[Supabase] No service role key – using anon key. RLS applies to all queries.');
  }

  return createClient<Database>(SUPABASE_URL, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: AdminClient | undefined;

// Server-side Supabase client - prefers service role, falls back to anon key.
// Import like: import { supabaseAdmin } from "@/integrations/supabase/client.server";
export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});