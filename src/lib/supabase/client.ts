import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser-side use.
 * Call this inside a component (not at module level) to avoid SSR issues.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
  );
}
