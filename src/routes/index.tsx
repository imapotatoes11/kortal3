import { Title } from "@solidjs/meta";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { useNavigate } from "@solidjs/router";
import { createResource, createEffect } from "solid-js";
import LoggedOutDotGridBackground from "~/components/special/logged-out-dot-grid-background";
// import Counter from "~/components/Counter";
import { Button } from "~/components/ui/button";
import LineDrawThenFillText from "~/components/special/line-draw-text";
import MinimalThemeSwitcher from "~/components/ui/minimal-theme-switcher";

export default function Home() {
    const navigate = useNavigate();

    const [user] = createResource(async () => {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return user;
    });

    createEffect(() => {
        if (user()) {
            navigate("/protected", { replace: true });
        }
    });

    return (
        <main class="flex justify-center items-center h-screen w-screen">
            <Title>Hello World</Title>
            <LoggedOutDotGridBackground />
            <MinimalThemeSwitcher />

            <div class="flex flex-col justify-center items-center gap-4 h-fit backdrop-blur-lg p-8 rounded-lg">
                <div>
                    <LineDrawThenFillText text="kortal²" duration={2} />
                </div>
                <div class="flex flex-row gap-2">
                    <a href="/sign-in">
                        <Button variant="ghost">Sign In</Button>
                    </a>
                    <span class="cursor-not-allowed">
                        <Button variant="ghost" disabled>
                            Sign Up
                        </Button>
                    </span>
                </div>
            </div>
        </main>
    );
}
