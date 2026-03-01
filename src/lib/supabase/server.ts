import { createServerClient } from "@supabase/ssr";
import { parseCookies, setCookie } from "h3";
import type { H3Event } from "h3";
import { getRequestEvent } from "solid-js/web";

/**
 * Creates a Supabase server client from an explicit H3 event.
 * Use this in middleware and API route handlers where you already have the event.
 */
export function createSupabaseServerClientFromEvent(nativeEvent: H3Event) {
    return createServerClient(
        // import.meta.env.VITE_SUPABASE_URL as string,
        // import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    const cookies = parseCookies(nativeEvent);
                    return Object.entries(cookies).map(([name, value]) => ({
                        name,
                        value,
                    }));
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setCookie(nativeEvent, name, value, options as any);
                    });
                },
            },
        },
    );
}

/**
 * Creates a Supabase server client using the current request event from
 * AsyncLocalStorage. Use this inside "use server" actions/functions.
 */
export function createSupabaseServerClient() {
    const nativeEvent = getRequestEvent()!.nativeEvent;
    return createSupabaseServerClientFromEvent(nativeEvent);
}
