"use client";

import type React from "react";
import type { LucideIcon } from "lucide-react";

/* The row of count tiles above a list — the same look as Client
 * Management's overview: icon chip, small uppercase label, big figure, and
 * a selected tile filled with its own hue. Each tile is a one-click filter;
 * clicking the live tile again (or the "all" tile) clears it. */

export type OverviewTile<K extends string> = {
    key: K;
    label: string;
    value: number | undefined;
    icon: LucideIcon;
    /** Icon chip classes (background + ink). */
    chip: string;
    /** Resting wash at the right edge, and the fill when selected. */
    tint: string;
    tintOn: string;
    /** Outline colour while selected. */
    ring: string;
};

export function OverviewTiles<K extends string>({ tiles, active, allKey, onSelect, ariaLabel }: {
    tiles: OverviewTile<K>[];
    active: K;
    /** The tile that means "no filter". */
    allKey: K;
    onSelect: (key: K) => void;
    ariaLabel: string;
}) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            // Phones 2-up, tablets 3-up (5 tiles) / 2-up (4 tiles) so the
            // figures never clip; the full single row from lg up as before.
            className={`grid shrink-0 grid-cols-2 gap-2 sm:gap-3 ${tiles.length === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"}`}
        >
            {tiles.map(({ key, label, value, icon: Icon, chip, tint, tintOn, ring }) => {
                const isActive = active === key;
                // A tile with nothing behind it would filter the list to zero
                // rows, so it isn't offered. The "all" tile stays live.
                const disabled = key !== allKey && value === 0;
                const style = {
                    background: isActive
                        ? `linear-gradient(110deg, ${tint} 0%, ${tintOn} 100%)`
                        : `linear-gradient(110deg, var(--color-surface, #fff) 30%, ${tint} 100%)`,
                    "--card-ring": ring,
                } as React.CSSProperties;
                return (
                    <button
                        key={key}
                        type="button"
                        style={style}
                        disabled={disabled}
                        aria-pressed={isActive}
                        onClick={() => onSelect(isActive ? allKey : key)}
                        className={`group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-hairline px-3 py-3 text-left transition-[box-shadow,background] sm:px-4 ${
                            isActive ? "card-selected-outline shadow-sm" : "shadow-xs"
                        } ${disabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"}`}
                    >
                        <span aria-hidden className={`hidden size-9 shrink-0 items-center justify-center rounded-lg border border-white/70 shadow-xs sm:inline-flex ${chip}`}>
                            <Icon className="size-[18px]" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                            <span className={`block truncate text-[11px] font-semibold uppercase leading-none tracking-wide ${isActive ? "text-heading" : "text-subtle"} ${disabled ? "" : "group-hover:text-heading"}`}>
                                {label}
                            </span>
                            <span className="mt-1.5 block text-xl font-bold leading-none tracking-tight text-heading tabular-nums sm:text-[22px]">
                                {value === undefined
                                    ? <span role="status" aria-label={`Loading ${label.toLowerCase()}`} className="my-1 block h-5 w-10 animate-pulse rounded bg-ink-100" />
                                    : value.toLocaleString()}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
