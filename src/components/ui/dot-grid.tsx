"use client";

// import { useEffect, useRef } from 'react';
import { createEffect } from "solid-js";

const GRID_DOT_COLOR = "127, 127, 127"; // 150, 150, 150
const LERP_FACTOR = 0.05; // 0.05
const BASE_OPACITY = 0.1; // 0.15
const GRID_SPACING = 30; // 30
const DOT_SIZE = 1; // 1.5

const simpleNoise = (x: number, y: number, t: number, scale: number) => {
    return (
        Math.sin(x * scale + t * 0.5) * Math.cos(y * scale + t * 0.3) +
        Math.sin(x * scale * 0.5 - t * 0.2) *
            Math.cos(y * scale * 0.5 + t * 0.1)
    );
};

type PatternFn = (
    x: number,
    y: number,
    t: number,
    cx: number,
    cy: number,
    params: Record<string, number>,
) => number;

type PatternDefinition = {
    label: string;
    params: Record<string, number>;
    getOpacity: PatternFn;
};

export const PATTERNS: Record<string, PatternDefinition> = {
    radialPulse: {
        label: "Radial Pulse",
        params: { speed: 1, density: 1, waveWidth: 1 },
        getOpacity: (x, y, t, cx, cy, params) => {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const wave = Math.sin(
                dist * 0.01 * params.density - t * params.speed,
            );
            const intensity = Math.max(0, wave);
            return intensity * params.waveWidth;
        },
    },
    spiralPulse: {
        label: "Spiral Pulse",
        params: { speed: 1, arms: 3, tightness: 1, waveWidth: 1 },
        getOpacity: (x, y, t, cx, cy, params) => {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            const arms = Math.max(1, params.arms || 1);
            const tightness = params.tightness || 1;

            const spiral =
                Math.sin(
                    angle * arms +
                        dist * 0.02 * tightness -
                        t * params.speed * 2,
                ) *
                    0.5 +
                0.5;
            const pulse =
                Math.sin(dist * 0.01 * tightness - t * params.speed) * 0.5 +
                0.5;

            const intensity = Math.max(0, spiral * pulse);
            return intensity * params.waveWidth;
        },
    },
    blobNoise: {
        label: "Organic Blobs",
        params: { speed: 0.8, scale: 1, contrast: 1 },
        getOpacity: (x, y, t, cx, cy, params) => {
            const noise = simpleNoise(
                x,
                y,
                t * params.speed,
                0.002 * params.scale,
            );
            return Math.max(0, (noise + 1) / 2) * params.contrast;
        },
    },
    diagonalWave: {
        label: "Diagonal Sweep",
        params: { speed: 1.2, width: 1, angle: 1 },
        getOpacity: (x, y, t, cx, cy, params) => {
            const angle = params.angle || 1;
            const rotatedX =
                (x - cx) * Math.cos(angle * 0.2) -
                (y - cy) * Math.sin(angle * 0.2);
            const rotatedY =
                (x - cx) * Math.sin(angle * 0.2) +
                (y - cy) * Math.cos(angle * 0.2);
            const diag = (rotatedX + rotatedY) * 0.5;
            const wave = Math.sin(diag * 0.01 - t * params.speed);
            return Math.max(0, wave ** (4 / params.width));
        },
    },
    scanlines: {
        label: "Scanlines",
        params: { speed: 2, thickness: 1, vertical: 0 },
        getOpacity: (x, y, t, cx, cy, params) => {
            const axis = params.vertical > 0.5 ? x : y;
            const wave = Math.sin(axis * 0.02 - t * params.speed * 2);
            const val = (wave + 1) / 2;
            return Math.pow(val, 8 / params.thickness);
        },
    },
    orbitRings: {
        label: "Orbit Rings",
        params: { speed: 1, count: 1, expansion: 1 },
        getOpacity: (x, y, t, cx, cy, params) => {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const ringOffset = t * 50 * params.speed;
            const rings = Math.sin(
                dist * 0.01 * params.count -
                    (params.expansion > 0.5 ? ringOffset * 0.05 : 0),
            );
            return (rings + 1) / 2;
        },
    },
};

type DotGridProps = {
    activePatternId?: keyof typeof PATTERNS;
    config?: Record<string, number>;
    paused?: boolean;
    reducedMotion?: boolean;
    className?: string;
};

export function DotGrid({
    activePatternId = "radialPulse",
    config = {},
    paused = false,
    reducedMotion = false,
    className = "",
}: DotGridProps) {
    // const canvasRef = useRef<HTMLCanvasElement | null>(null);
    let canvasRef: HTMLCanvasElement | null;
    // const containerRef = useRef<HTMLDivElement | null>(null);
    let containerRef: HTMLDivElement | null;

    // const stateRef = useRef({
    //     time: 0,
    //     dots: [] as { x: number; y: number; baseOpacity: number }[],
    //     width: 0,
    //     height: 0,
    //     currentParams: { ...config },
    // });
    const stateRef = {
        current: {
            time: 0,
            dots: [] as { x: number; y: number; baseOpacity: number }[],
            width: 0,
            height: 0,
            currentParams: { ...config },
        },
    };

    createEffect(() => {
        const canvas = canvasRef; // .current
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        let animationFrameId: number;

        stateRef.current.currentParams = {
            ...stateRef.current.currentParams,
            ...config,
        };

        const resize = () => {
            if (!containerRef) return;

            const { clientWidth, clientHeight } = containerRef;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = clientWidth * dpr;
            canvas.height = clientHeight * dpr;
            canvas.style.width = `${clientWidth}px`;
            canvas.style.height = `${clientHeight}px`;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);

            stateRef.current.width = clientWidth;
            stateRef.current.height = clientHeight;

            const dots = [] as { x: number; y: number; baseOpacity: number }[];
            const cols = Math.ceil(clientWidth / GRID_SPACING);
            const rows = Math.ceil(clientHeight / GRID_SPACING);

            for (let i = 0; i < cols; i += 1) {
                for (let j = 0; j < rows; j += 1) {
                    dots.push({
                        x: i * GRID_SPACING + GRID_SPACING / 2,
                        y: j * GRID_SPACING + GRID_SPACING / 2,
                        baseOpacity: BASE_OPACITY,
                    });
                }
            }

            stateRef.current.dots = dots;
        };

        const handleResize = () => resize();

        window.addEventListener("resize", handleResize);
        resize();

        const render = () => {
            const speedMult = reducedMotion ? 0.1 : 1;
            if (!paused) {
                stateRef.current.time += 0.015 * speedMult;
            }

            const patternDef =
                PATTERNS[activePatternId] || PATTERNS.radialPulse;
            const activeParams = patternDef.params;
            const currentParams = stateRef.current.currentParams;

            // Smooth parameter transitions so pattern swaps are not jarring.
            Object.keys(activeParams).forEach((key) => {
                const target = config[key] ?? activeParams[key] ?? 1;
                const current = currentParams[key] ?? target;
                currentParams[key] = current + (target - current) * LERP_FACTOR;
            });

            ctx.clearRect(
                0,
                0,
                stateRef.current.width,
                stateRef.current.height,
            );

            const { width, height, time, dots } = stateRef.current;
            const cx = width / 2;
            const cy = height / 2;
            const patternFn = patternDef.getOpacity;

            dots.forEach((dot) => {
                const dynamicAlpha = patternFn(
                    dot.x,
                    dot.y,
                    time,
                    cx,
                    cy,
                    currentParams,
                );

                let finalAlpha = dot.baseOpacity + dynamicAlpha * 0.7; // * 0.4

                if (reducedMotion) {
                    finalAlpha = dot.baseOpacity + dynamicAlpha * 0.2; // 0.1
                }

                finalAlpha = Math.min(Math.max(finalAlpha, 0), 1);

                ctx.fillStyle = `rgba(${GRID_DOT_COLOR}, ${finalAlpha})`;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, DOT_SIZE, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = window.requestAnimationFrame(render);
        };

        animationFrameId = window.requestAnimationFrame(render);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.cancelAnimationFrame(animationFrameId);
        };
    }, [activePatternId, config, paused, reducedMotion]);

    return (
        <div
            ref={(el) => (containerRef = el)}
            // class={`absolute inset-0 -z-10 bg-[#0a0a0b] overflow-hidden pointer-events-none ${className}`}
            class={`absolute inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}
        >
            <canvas
                ref={(el) => (canvasRef = el)}
                class="block h-full w-full"
            />
        </div>
    );
}

export default DotGrid;
