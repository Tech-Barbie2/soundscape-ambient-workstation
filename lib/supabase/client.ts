/**
 * SoundScape — Supabase Browser Client
 * Location: lib/supabase/client.ts
 *
 * Safe for Next.js Client Components ('use client')
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
