"use client";

// The generated attendance list — laid out like the downloaded workbook so
// what is on screen is what goes out: S.No · Student Name · Specialization ·
// Batch & Trainers (merged down its students) · one column per working day
// (P / A / H) · Working Days · Present · Absent · Percentage. Download Excel
// sits on the list itself.

import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { batchCaption, runs, type SheetLine } from "@/app/lms/pages/attendancemanagement/features/attendanceWorkbook";

type Mark = "P" | "A" | "H";
type RowStats = { p: number; a: number; h: number; n: number; effPresent: number; attPct: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayKeyOf = (d: Date) => d.toISOString().slice(0, 10);
const dateWords = (key: string) => {
    const [y, m, d] = key.split("-");
    return `${d} ${MONTHS[Number(m) - 1] || m} ${y}`;
};
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const MARK_STYLE: Record<Mark, string> = {
    P: "bg-[#ECFDF3] text-[#067647]",
    A: "bg-[#F04438] text-white font-bold",
    H: "bg-[#FEF0C7] text-[#B54708]",
};
const pctTone = (pct: number) => (pct >= 75 ? "text-[#067647]" : pct >= 60 ? "text-[#B54708]" : "text-[#B42318]");

const TH = "sticky top-0 z-10 border-b border-r border-hairline bg-[#EAF7F9] px-2.5 py-2 text-[11px] font-semibold text-heading";
const TD = "border-b border-r border-hairline px-2.5 py-2 align-middle";

export default function AttendanceReportList({
    lines, days, grid, rowStats, from, to, onDownload,
}: {
    lines: SheetLine[];
    days: Date[];
    grid: Map<string, Map<string, Mark>>;
    rowStats: (studentId: string) => RowStats;
    from: string;
    to: string;
    onDownload: () => Promise<void>;
}) {
    const [downloading, setDownloading] = useState(false);
    const dayKeys = useMemo(() => days.map(dayKeyOf), [days]);
    const showDept = lines.some((l) => (l.s.department || "").trim());
    // Batch & Trainers is written once per run of its students.
    const batchSpan = useMemo(() => {
        const span = new Array<number>(lines.length).fill(0);
        for (const [start, len] of runs(lines, (l) => l.batch.id || l.batch.name)) span[start] = len;
        return span;
    }, [lines]);

    const download = async () => {
        setDownloading(true);
        try {
            await onDownload();
        } catch (e) {
            console.error(e);
            toast.error("Could not download the attendance sheet");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-heading">Attendance list</h2>
                    <p className="mt-0.5 text-2xs text-subtle">
                        {lines.length} student{lines.length === 1 ? "" : "s"} · {days.length} working day{days.length === 1 ? "" : "s"} ·{" "}
                        {from === to ? dateWords(from) : `${dateWords(from)} – ${dateWords(to)}`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-2xs text-subtle" aria-label="Legend">
                        {(["P", "A", "H"] as const).map((m) => (
                            <span key={m} className="inline-flex items-center gap-1">
                                <span className={`inline-flex size-5 items-center justify-center rounded text-[10.5px] font-semibold ${MARK_STYLE[m]}`}>{m}</span>
                                {m === "P" ? "Present" : m === "A" ? "Absent" : "Half-day"}
                            </span>
                        ))}
                        <span className="inline-flex items-center gap-1">
                            <span className="inline-flex size-5 items-center justify-center rounded border border-hairline text-faint">–</span>Not marked
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => void download()}
                        disabled={downloading || lines.length === 0}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#079455] px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#067647] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {downloading ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                        {downloading ? "Preparing…" : "Download Excel"}
                    </button>
                </div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
                    <thead>
                        <tr>
                            <th className={`${TH} left-0 z-20 w-12 text-center`}>S.No</th>
                            <th className={`${TH} left-12 z-20 min-w-[200px] text-left`}>Student Name</th>
                            {showDept && <th className={`${TH} min-w-[110px] text-center`}>Specialization</th>}
                            <th className={`${TH} min-w-[170px] text-center`}>Batch &amp; Trainers</th>
                            {days.map((d, i) => (
                                <th key={dayKeys[i]} className={`${TH} min-w-[64px] text-center`}>
                                    <span className="block whitespace-nowrap">{String(d.getUTCDate()).padStart(2, "0")}-{MONTHS[d.getUTCMonth()]}</span>
                                    <span className="block text-[10px] font-medium text-subtle">{WEEKDAYS[d.getUTCDay()]}</span>
                                </th>
                            ))}
                            <th className={`${TH} min-w-[80px] text-center`}>Working Days</th>
                            <th className={`${TH} min-w-[72px] text-center`}>Present</th>
                            <th className={`${TH} min-w-[72px] text-center`}>Absent</th>
                            <th className={`${TH} min-w-[86px] text-center`}>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((l, i) => {
                            const st = rowStats(l.s._id);
                            const cells = grid.get(l.s._id);
                            const absent = st.a + st.h * 0.5;
                            return (
                                <tr key={l.s._id} className="hover:bg-row-hover">
                                    <td className={`${TD} sticky left-0 z-[1] w-12 bg-surface text-center tabular-nums text-subtle`}>{i + 1}</td>
                                    <td className={`${TD} sticky left-12 z-[1] bg-surface`}>
                                        <span className="block font-semibold text-heading">{l.name}</span>
                                        {l.s.email && <span className="block max-w-[220px] truncate text-2xs text-faint" title={l.s.email}>{l.s.email}</span>}
                                    </td>
                                    {showDept && <td className={`${TD} text-center font-semibold text-body`}>{l.s.department || "—"}</td>}
                                    {batchSpan[i] > 0 && (
                                        <td rowSpan={batchSpan[i]} className={`${TD} bg-surface text-center align-middle`}>
                                            <span className="block font-semibold text-heading">{batchCaption(l.batch)}</span>
                                            {l.batch.trainers.length > 0 && <span className="mt-0.5 block text-2xs text-subtle">{l.batch.trainers.join(" & ")}</span>}
                                        </td>
                                    )}
                                    {dayKeys.map((dk) => {
                                        const m = cells?.get(dk);
                                        return (
                                            <td key={dk} className={`${TD} text-center`}>
                                                {m
                                                    ? <span className={`inline-flex size-6 items-center justify-center rounded text-[11px] font-semibold ${MARK_STYLE[m]}`}>{m}</span>
                                                    : <span className="text-faint">–</span>}
                                            </td>
                                        );
                                    })}
                                    <td className={`${TD} text-center tabular-nums font-semibold text-heading`}>{days.length}</td>
                                    <td className={`${TD} text-center tabular-nums text-[#067647]`}>{num(st.effPresent)}</td>
                                    <td className={`${TD} text-center tabular-nums text-[#B42318]`}>{num(absent)}</td>
                                    <td className={`${TD} text-center tabular-nums font-bold ${pctTone(st.attPct)}`}>{Math.round(st.attPct)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
