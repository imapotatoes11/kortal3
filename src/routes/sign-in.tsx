import { action, redirect, useSubmission } from "@solidjs/router";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const signInAction = action(async (formData: FormData) => {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    throw redirect("/protected");
}, "sign-in");

export default function SignIn() {
    const submission = useSubmission(signInAction);

    return (
        <main>
            <h1>Sign In</h1>
            <form method="post" action={signInAction}>
                <div>
                    <label for="email">Email</label>
                    <br />
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autocomplete="email"
                    />
                </div>
                <div>
                    <label for="password">Password</label>
                    <br />
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        autocomplete="current-password"
                    />
                </div>
                {submission.result?.error && (
                    <p style="color:red">{submission.result.error}</p>
                )}
                <button type="submit" disabled={submission.pending}>
                    {submission.pending ? "Signing in…" : "Sign in"}
                </button>
            </form>
            <p>
                <a href="/sign-up">Create an account</a> &nbsp;|&nbsp;{" "}
                <a href="/forgot-password">Forgot password?</a>
            </p>
        </main>
    );
}
