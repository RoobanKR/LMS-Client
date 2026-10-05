"use client";

import { useEffect, useRef, useState } from "react";

/** Page size that fits the table card's height — the sizing Client
 *  Management uses, so the pager sits at the bottom without page scroll.
 *  Picking a size by hand (`setManual`) turns the fitting off. */
export function useAutoFitPageSize(initial = 10) {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const footerRef = useRef<HTMLDivElement | null>(null);
    const [pageSize, setPageSize] = useState(initial);
    const [autoFit, setAutoFit] = useState(true);

    useEffect(() => {
        if (!autoFit) return;
        const card = cardRef.current;
        if (!card) return;
        const HEADER_H = 40, ROW_H = 40, SAFETY = 4;
        const compute = () => {
            if (card.clientHeight <= 0) return;
            const footerH = footerRef.current?.clientHeight ?? 44;
            const fits = Math.max(3, Math.min(50, Math.floor((card.clientHeight - HEADER_H - footerH - SAFETY) / ROW_H)));
            setPageSize((prev) => (prev === fits ? prev : fits));
        };
        compute();
        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(compute, 100); });
        ro.observe(card);
        return () => { ro.disconnect(); clearTimeout(timer); };
    }, [autoFit]);

    const setManual = (n: number) => { setAutoFit(false); setPageSize(n); };
    return { cardRef, footerRef, pageSize, setManual };
}
