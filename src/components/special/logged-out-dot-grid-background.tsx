"use client";

// import { useMemo } from 'react';
import { createMemo } from "solid-js";
import DotGrid from "~/components/ui/dot-grid";

export default function LoggedOutDotGridBackground() {
    const numberOfArms = createMemo(() => Math.floor(Math.random() * 5 + 2));
    const config = createMemo(() => ({ arms: numberOfArms() }));
    return (
        <DotGrid
            activePatternId="spiralPulse"
            config={config()}
            className="fixed inset-0"
        />
    );
}
