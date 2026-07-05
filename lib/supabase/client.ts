// lib/supabase/client.ts
// Supabase client for use in Client Components ("use client").
// Do NOT use this in Server Components, Server Actions, or Route Handlers —
// use lib/supabase/server.ts there instead.

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
