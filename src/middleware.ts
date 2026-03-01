import { createMiddleware } from "@solidjs/start/middleware";
import { parseCookies, setCookie, sendRedirect } from "h3";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIX = "/protected";

export default createMiddleware({
    onRequest: [
        async (event) => {
            console.log("asdfjkl");
            const nativeEvent = event.nativeEvent;
            const url = new URL(event.request.url);

            // Only check auth for protected routes
            if (!url.pathname.startsWith(PROTECTED_PREFIX)) {
                console.log("Not a protected route, skipping auth check");
                console.log(url.pathname);
                return;
            }

            const supabase = createServerClient(
                process.env.VITE_SUPABASE_URL!,
                process.env.VITE_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() {
                            const cookies = parseCookies(nativeEvent);
                            return Object.entries(cookies).map(
                                ([name, value]) => ({ name, value }),
                            );
                        },
                        setAll(cookiesToSet) {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                setCookie(
                                    nativeEvent,
                                    name,
                                    value,
                                    options as any,
                                );
                            });
                        },
                    },
                },
            );

            // getSession also refreshes the access token from the refresh token if expired
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                console.log("No session found, redirecting to sign-in");
                return sendRedirect(nativeEvent, "/sign-in", 302);
            }
        },
    ],
});
