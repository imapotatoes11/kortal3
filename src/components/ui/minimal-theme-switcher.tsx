import { Switch, Match } from "solid-js";
import { useTheme } from "solidjs-themes";
import { buttonVariants } from "~/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { MoonIcon, SunIcon, MonitorIcon, ChevronDownIcon } from "lucide-solid";
import { cn } from "@/lib/utils";

interface MinimalThemeSwitcherProps {
    class?: string;
}

export default function MinimalThemeSwitcher({
    class: className = "",
}: MinimalThemeSwitcherProps) {
    const { theme, setTheme } = useTheme();

    return (
        <div class={className}>
            <DropdownMenu>
                <DropdownMenuTrigger
                    class={cn(
                        buttonVariants({ variant: "ghost" }),
                        "cursor-pointer",
                    )}
                >
                    <Switch>
                        <Match when={theme() === "light"}>
                            <SunIcon />
                        </Match>
                        <Match when={theme() === "dark"}>
                            <MoonIcon />
                        </Match>
                        <Match when={theme() === "system"}>
                            <MonitorIcon />
                        </Match>
                    </Switch>
                    <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setTheme("light")}>
                        <SunIcon />
                        <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setTheme("dark")}>
                        <MoonIcon />
                        <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setTheme("system")}>
                        <MonitorIcon />
                        <span>System</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
