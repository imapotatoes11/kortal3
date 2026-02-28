import { action, redirect, createAsync } from "@solidjs/router";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { Suspense } from "solid-js";

// ── Server actions ────────────────────────────────────────────────────────────

const signOutAction = action(async () => {
  "use server";
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  throw redirect("/sign-in");
}, "sign-out");

async function getUser() {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Protected() {
  const user = createAsync(() => getUser());

  return (
    <main>
      <h1>Protected</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <p>Signed in as: {user()?.email}</p>
      </Suspense>
      <form method="post" action={signOutAction}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
