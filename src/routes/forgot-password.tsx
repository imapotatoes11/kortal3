import { action, useSubmission } from "@solidjs/router";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const forgotPasswordAction = action(async (formData: FormData) => {
  "use server";
  const email = formData.get("email") as string;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${new URL(import.meta.env.VITE_SITE_URL ?? "http://localhost:3000").origin}/protected/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}, "forgot-password");

export default function ForgotPassword() {
  const submission = useSubmission(forgotPasswordAction);

  return (
    <main>
      <h1>Forgot Password</h1>
      {submission.result?.success ? (
        <p>Check your email for a password reset link.</p>
      ) : (
        <form method="post" action={forgotPasswordAction}>
          <div>
            <label for="email">Email</label>
            <br />
            <input id="email" name="email" type="email" required autocomplete="email" />
          </div>
          {submission.result?.error && <p style="color:red">{submission.result.error}</p>}
          <button type="submit" disabled={submission.pending}>
            {submission.pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p>
        <a href="/sign-in">Back to sign in</a>
      </p>
    </main>
  );
}
