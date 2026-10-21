"use client";

// A toolbar filter for the assignment / assessment lists: the same h-8
// bordered control as the search box, opening a styled list of choices
// instead of the browser's native <select> dropdown. Highlighted (brand wash)
// while a filter is set; closes on a pick, an outside click or Escape.

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface ToolbarSelectOption {
  value: string;
  label: string;
}

export function ToolbarSelect({
  value,
  options,
  onChange,
  ariaLabel,
  minWidth = 120,
}: {
  value: string;
  options: ToolbarSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];
  const active = !!value;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-8 items-center justify-between gap-2 rounded-control border px-2.5 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/15 ${
          active
            ? "border-brand bg-brand-wash text-brand-strong"
            : "border-hairline-strong bg-surface text-body hover:bg-row-hover"
        }`}
        style={{ minWidth }}
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-subtle transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-30 mt-1 w-max min-w-full rounded-xl border border-hairline bg-surface p-1 shadow-lg"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value || "all"}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors duration-150 ${
                  selected ? "bg-ink-100 font-semibold text-heading" : "font-medium text-body hover:bg-row-hover"
                }`}
              >
                <span className="whitespace-nowrap">{o.label}</span>
                {selected && <Check size={13} className="shrink-0 text-brand-strong" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
