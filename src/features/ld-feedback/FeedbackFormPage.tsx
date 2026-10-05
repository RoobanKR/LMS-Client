"use client";

import { ArrowLeft, BarChart3, BookOpen, CalendarDays, Layers, MessageSquare, UserRound, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/app/lms/shared/ui/Tabs";
import { StatusPill } from "@/app/lms/shared/ui";
import { useGetFeedbackById } from "@/app/lms/pages/coursestructure/feedback/hooks/useFeedback";
import type { Feedback } from "@/app/lms/pages/coursestructure/feedback/types/feedback";
import FeedbackAnalysisTab from "./FeedbackAnalysisTab";
import FeedbackReportTab from "./FeedbackReportTab";
import { FORM_STATUS, windowLabel, type FeedbackRow } from "./lib";
import type { FormTab } from "./FeedbackFormList";

/* One feedback form — the "View" destination from the list. A single header
 * line (back · form · status on the left, course / batch / trainer / window
 * / responses on the right), then two tabs in Course Setup's style:
 * Feedback (the form's analysis, default) and Report (generate → preview →
 * download). */

// The underline tab look Course Setup's Courses | Report strip uses.
const TAB_TRIGGER =
    "relative mr-0 inline-flex h-10 flex-none items-center gap-2 whitespace-nowrap rounded-none rounded-t-lg border-0 bg-transparent px-3.5 text-sm font-bold tracking-tight text-subtle shadow-none hover:bg-row-hover hover:text-heading after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-brand-strong data-[state=active]:shadow-none data-[state=active]:after:bg-brand-500 [&[data-state=active]_svg]:text-brand-500";

export default function FeedbackFormPage({ row, tab, onTab, onBack }: {
    row: FeedbackRow;
    tab: FormTab;
    onTab: (tab: FormTab) => void;
    onBack: () => void;
}) {
    // The form as its own report pages read it (by id); the list's copy
    // stands in until it arrives so the page never opens blank.
    const { data } = useGetFeedbackById(row.id);
    const feedback = (data ?? row.raw) as Feedback;
    const status = FORM_STATUS[row.status];

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* ── Form header — one line ── */}
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to all feedback forms"
                        title="Back to all feedback forms"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-hairline text-subtle transition-colors hover:bg-row-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    >
                        <ArrowLeft size={15} strokeWidth={2.2} />
                    </button>
                    <h1 className="min-w-0 truncate text-xl font-bold text-heading" title={row.title}>{row.title}</h1>
                    <StatusPill tone={status.tone} dot className="shrink-0">{status.label}</StatusPill>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                    <span className="inline-flex items-center gap-1.5" title={row.client ? `${row.course} · ${row.client}` : row.course}>
                        <BookOpen size={13} className="text-faint" aria-hidden />{row.course}
                    </span>
                    {row.batch && row.batch !== "—" && (
                        <span className="inline-flex items-center gap-1.5"><Layers size={13} className="text-faint" aria-hidden />{row.batch}</span>
                    )}
                    <span className="inline-flex items-center gap-1.5"><UserRound size={13} className="text-faint" aria-hidden />{row.trainer}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} className="text-faint" aria-hidden />{windowLabel(row.start, row.end)}</span>
                    <span className="inline-flex items-center gap-1.5">
                        <Users size={13} className="text-faint" aria-hidden />
                        {row.responses}{row.denom ? ` of ${row.denom}` : ""} responded
                    </span>
                </div>
            </header>

            {/* ── Tabs ── */}
            <Tabs value={tab} onValueChange={(v) => onTab(v as FormTab)} activationMode="manual" className="mt-2 flex min-h-0 flex-1 flex-col">
                <div className="no-print shrink-0 border-b border-hairline">
                    <TabsList aria-label="Feedback form sections" className="h-auto gap-1 rounded-none border-b-0 bg-transparent p-0">
                        <TabsTrigger value="feedback" className={TAB_TRIGGER}>
                            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Feedback
                        </TabsTrigger>
                        <TabsTrigger value="report" className={TAB_TRIGGER}>
                            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Report
                        </TabsTrigger>
                    </TabsList>
                </div>
                {/* One host for both tabs (no TabsContent), so switching back
                    and forth keeps nothing mounted that isn't on screen. */}
                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                    {tab === "report"
                        ? <FeedbackReportTab key={`report-${row.id}`} feedback={feedback} feedbackId={row.id} courseId={row.courseId} />
                        : <FeedbackAnalysisTab key={`feedback-${row.id}`} feedback={feedback} courseId={row.courseId} />}
                </div>
            </Tabs>
        </div>
    );
}
