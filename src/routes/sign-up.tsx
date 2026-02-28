import { action, redirect, useSubmission } from "@solidjs/router";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const signUpAction = action(async (formData: FormData) => {
  "use server";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Supabase will send a confirmation email; the link redirects here
      emailRedirectTo: `${new URL(import.meta.env.VITE_SITE_URL ?? "http://localhost:3000").origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Don't redirect — tell the user to check their email
  return { success: true };
}, "sign-up");

export default function SignUp() {
  const submission = useSubmission(signUpAction);

  return (
    <main>
      <h1>Sign Up</h1>
      {submission.result?.success ? (
        <p>Check your email for a confirmation link.</p>
      ) : (
        <form method="post" action={signUpAction}>
          <div>
            <label for="email">Email</label>
            <br />
            <input id="email" name="email" type="email" required autocomplete="email" />
          </div>
          <div>
            <label for="password">Password</label>
            <br />
            <input
              id="password"
              name="password"
              type="password"
              required
              autocomplete="new-password"
              minlength="6"
            />
          </div>
          {submission.result?.error && <p style="color:red">{submission.result.error}</p>}
          <button type="submit" disabled={submission.pending}>
            {submission.pending ? "Creating account…" : "Sign up"}
          </button>
        </form>
      )}
      <p>
        Already have an account? <a href="/sign-in">Sign in</a>
      </p>
    </main>
  );
}
