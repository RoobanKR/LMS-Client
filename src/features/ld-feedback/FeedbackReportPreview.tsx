"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Modal } from "@/app/lms/shared/ui";
import type { Feedback } from "@/app/lms/pages/coursestructure/feedback/types/feedback";
import { FeedbackSheet, MasterDataTable, type Workbook } from "@/app/lms/pages/coursestructure/feedback/report/workbookShared";
import {
    ConsolidatedReportTable,
    exportReportExcel,
    exportReportPdf,
} from "@/app/lms/pages/coursestructure/feedback/report/feedbackReportShared";

/* Preview Report — the workbook exactly as it downloads. The three sheets
 * of the Excel file (Master Data · Feedback · Consolidated Report) sit as
 * tabs along the bottom, the way Excel shows them; Download Excel / PDF run
 * the Feedback Report page's own exporters on the same data. */

type Sheet = "master" | "feedback" | "consolidated";
const SHEETS: Array<{ key: Sheet; label: string }> = [
    { key: "master", label: "Master Data" },
    { key: "feedback", label: "Feedback" },
    { key: "consolidated", label: "Consolidated Report" },
];

export default function FeedbackReportPreview({ open, onClose, feedback, wb, audienceCount, notSubmitted, scopeLine }: {
    open: boolean;
    onClose: () => void;
    feedback: Feedback;
    wb: Workbook;
    audienceCount: number;
    notSubmitted: { id: string; name: string }[];
    /** "Batch A · Trainer: … · Generated …" under the title. */
    scopeLine: string;
}) {
    const [sheet, setSheet] = useState<Sheet>("consolidated");
    const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);

    const download = async (kind: "excel" | "pdf") => {
        setBusy(kind);
        try {
            if (kind === "excel") await exportReportExcel(feedback, wb, audienceCount, notSubmitted);
            else await exportReportPdf(feedback, wb, audienceCount, notSubmitted);
        } catch (err) {
            console.error(err);
            toast.error(kind === "excel" ? "Could not download the Excel file" : "Could not download the PDF");
        } finally {
            setBusy(null);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="full"
            stableHeight
            compact
            title={`Feedback Report — ${feedback.feedbackTitle || "Feedback"}`}
            description={scopeLine}
            footer={
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    {/* Sheet tabs — the Excel file's own tabs, in its order. */}
                    <div role="tablist" aria-label="Report sheets" className="-my-2.5 flex items-stretch self-stretch">
                        {SHEETS.map((s) => {
                            const active = s.key === sheet;
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setSheet(s.key)}
                                    className={`relative -mt-px border-x border-transparent px-4 text-xs transition-colors ${active
                                        ? "border-x-hairline bg-surface font-semibold text-emerald-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-emerald-600"
                                        : "font-medium text-subtle hover:bg-row-hover hover:text-heading"}`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void download("pdf")}
                            disabled={busy !== null}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-hairline-strong bg-surface px-3.5 text-xs font-semibold text-body transition-colors hover:bg-row-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {busy === "pdf" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5 text-red-600" />}
                            Download PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => void download("excel")}
                            disabled={busy !== null}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-gradient-to-b from-brand-400 to-brand-600 px-4 text-xs font-bold text-white shadow-brand transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {busy === "excel" ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
                            Download Excel
                        </button>
                    </div>
                </div>
            }
        >
            {sheet === "master" && <MasterDataTable wb={wb} />}
            {sheet === "feedback" && <FeedbackSheet feedback={feedback} wb={wb} />}
            {sheet === "consolidated" && (
                <ConsolidatedReportTable wb={wb} audienceCount={audienceCount} notSubmitted={notSubmitted} />
            )}
        </Modal>
    );
}
