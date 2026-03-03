import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ThemeProvider } from "solidjs-themes";
import "./app.css";

export default function App() {
    return (
        <Router
            root={(props) => (
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <MetaProvider>
                        {/*<Title>SolidStart - Basic</Title>*/}
                        {/*<a href="/">Index</a>
          <a href="/about">About</a>*/}
                        <Suspense>{props.children}</Suspense>
                    </MetaProvider>
                </ThemeProvider>
            )}
        >
            <FileRoutes />
        </Router>
    );
}
