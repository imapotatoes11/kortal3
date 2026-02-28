import type { APIEvent } from "@solidjs/start/server";
import { redirect } from "@solidjs/router";
import { createSupabaseServerClientFromEvent } from "~/lib/supabase/server";

/**
 * Handles Supabase auth callbacks:
 *  - Email confirmation (sign-up)
 *  - Password reset (magic link)
 *  - OAuth providers
 *
 * Supabase redirects here with ?code=... after the user clicks a link.
 * We exchange the code for a session and then redirect the user.
 */
export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/protected";

  if (code) {
    const supabase = createSupabaseServerClientFromEvent(event.nativeEvent);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      throw redirect(next, { status: 302 });
    }
  }

  // Something went wrong — send to sign-in with an error hint
  throw redirect("/sign-in?error=auth_callback_failed", { status: 302 });
}
