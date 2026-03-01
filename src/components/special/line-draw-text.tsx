"use client";
import { Motion } from "solid-motionone";

export default function LineDrawThenFillText({
    text,
    duration = 1,
    fontSize = 64,
}: {
    text: string;
    duration?: number;
    fontSize?: number;
}) {
    const fillDelay = duration;

    return (
        // <svg viewBox="0 0 600 120" className="w-full h-auto block">
        <svg viewBox="0 0 506 86" class="w-full h-auto block">
            {/* Stroke layer */}
            <Motion.text
                x="50%"
                y="50%"
                text-anchor="middle"
                dominant-baseline="middle"
                class="font-mono"
                font-size={`${fontSize}`}
                fill="transparent"
                stroke="currentColor"
                stroke-width="0.75"
                stroke-linejoin="round"
                stroke-linecap="round"
                initial={{
                    strokeDasharray: 1400,
                    strokeDashoffset: 1400,
                    opacity: 1,
                }}
                animate={{ strokeDashoffset: 0, opacity: 1 }}
                transition={{ duration, easing: "ease-in-out" }}
            >
                {text}
            </Motion.text>

            {/* Filled layer (same coordinate space) */}
            <Motion.text
                x="50%"
                y="50%"
                text-anchor="middle"
                dominant-baseline="middle"
                class="font-mono"
                font-size={`${fontSize}`}
                fill="currentColor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                    duration: 0.6,
                    easing: "ease-out",
                    delay: fillDelay - fillDelay * (2.25 / 3),
                }}
            >
                {text}
            </Motion.text>
        </svg>
    );
}
