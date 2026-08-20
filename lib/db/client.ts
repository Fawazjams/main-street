import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase, if it is configured.
 *
 * Everything in the app degrades to the in-memory seed listings when it is
 * not, the same way the rent check reports itself as not run without a HUD
 * token. That keeps the checker demoable on a fresh clone with no backend at
 * all, and it means a database outage costs the map rather than the whole page.
 *
 * Reads and writes go through route handlers rather than the browser. There is
 * no auth yet, so the row-level policies are wide open — the server being the
 * only caller is the one thing keeping the anon key off the client for now.
 */
let cached: SupabaseClient | null = null;

export const dbConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function db(): SupabaseClient | null {
  if (!dbConfigured()) return null;
  cached ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  return cached;
}
