"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, GraduationCap, Layers, Rows3, UserRound, CalendarRange, type LucideIcon } from "lucide-react";
import type { Feedback } from "@/app/lms/pages/coursestructure/feedback/types/feedback";
import { useGetAllFeedback } from "@/app/lms/pages/coursestructure/feedback/hooks/useFeedback";
import { useReportFilters } from "@/app/lms/pages/coursestructure/feedback/report/ReportFilters";
import { buildWorkbook } from "@/app/lms/pages/coursestructure/feedback/report/workbookShared";
import { GeneratedReportBody } from "@/app/lms/pages/coursestructure/feedback/report/feedbackReportShared";
import {
    FilterLabel, ReportActionRow, ReportEmptyState, ReportHeading, ReportShowingRow,
    useNextStepNudge, type ReportChip,
} from "@/app/lms/shared/report/reportKit";
import FeedbackReportPreview from "./FeedbackReportPreview";

/* A form's Report tab — Client Management ▸ Reports' flow (filters →
 * Generate Report → review → Preview Report) around the Feedback Report the
 * course's own Feedback screen produces. The filters are that report's own
 * (Degree, Batch, Department, Section, Semester, Trainer — in that order),
 * the body is its consolidated report, and the downloads are its Excel
 * (Master Data · Feedback · Consolidated Report) and PDF.
 *
 * The filters are a draft: the report below is a snapshot taken at Generate,
 * so changing a filter afterwards can't silently disagree with the report
 * on screen. */

type Snapshot = {
    feedback: Feedback;
    audienceCount: number;
    notSubmitted: { id: string; name: string }[];
    batchNameByStudent: Map<string, string>;
    anonymousExcluded: number;
    batch: string;
    trainer: string;
    trainerLabel: string;
    section: string;
    semester: string;
    isDegree: boolean;
    generated: string;
};

type ChipKey = "batch" | "trainer" | "section" | "semester";

const SELECT = "h-9 w-full rounded-[10px] border border-[#e7ddd1] bg-surface px-3 text-xs text-heading shadow-xs outline-none transition-colors hover:border-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand/15";
const READ_ONLY = "flex h-9 w-full items-center truncate rounded-[10px] border border-[#e7ddd1] bg-ink-50 px-3 text-xs text-subtle";

function Field({ icon, tone, label, children }: { icon: LucideIcon; tone: string; label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <FilterLabel icon={icon} tone={tone}>{label}</FilterLabel>
            {children}
        </div>
    );
}

export default function FeedbackReportTab({ feedback, feedbackId, courseId }: {
    feedback: Feedback;
    feedbackId: string;
    courseId: string;
}) {
    // The Feedback Report page's own filter model and data — same hook, so a
    // given selection yields the same forms, responses and audience here.
    const rf = useReportFilters(courseId, feedbackId, feedback);
    const courseForms = useGetAllFeedback(courseId);

    /* ── Defaults: this form's batch, and this form as the trainer ──
     * The hook picks the batch; the trainer starts on the form that was
     * opened (the hook would start on "All trainers", which reads as a
     * different report from the one in the page header). */
    const [defaults, setDefaults] = useState<{ batch: string; trainer: string } | null>(null);
    useEffect(() => {
        if (defaults || rf.loading || courseForms.isLoading) return;
        // Wait for the hook to pick a batch — unless the course has none.
        if (rf.batchOptions.length && !rf.batchSel) return;
        const own = rf.trainerOptions.some((o) => o.feedbackId === feedbackId);
        setDefaults({ batch: rf.batchSel, trainer: own ? feedbackId : "all" });
        if (own) rf.setTrainerSel(feedbackId);
    }, [defaults, rf, feedbackId, courseForms.isLoading]);

    const draft = useMemo(
        () => ({ batch: rf.batchSel, trainer: rf.trainerSel, section: rf.secSel, semester: rf.semSel }),
        [rf.batchSel, rf.trainerSel, rf.secSel, rf.semSel],
    );
    const { isFresh, seen, markGenerated, markSeen, clear } = useNextStepNudge(draft);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const ready = !rf.loading && !courseForms.isLoading && Boolean(rf.activeFeedback) && Boolean(defaults);
    const trainerLabel = (id: string) =>
        id === "all" ? "All Trainers" : rf.trainerOptions.find((o) => o.feedbackId === id)?.trainerName || "Trainer";

    const generate = () => {
        if (!rf.activeFeedback) return;
        setSnapshot({
            feedback: rf.activeFeedback,
            audienceCount: rf.audience.length,
            notSubmitted: rf.notSubmitted,
            batchNameByStudent: rf.batchNameByStudent,
            anonymousExcluded: rf.anonymousExcluded,
            batch: rf.batchSel,
            trainer: rf.trainerSel,
            trainerLabel: trainerLabel(rf.trainerSel),
            section: rf.secSel,
            semester: rf.semSel,
            isDegree: rf.isDegree,
            generated: new Date().toLocaleString(),
        });
        markGenerated(draft);
    };

    // × on a chip drops that narrowing and regenerates once the filter
    // state has settled (the report reads the hook's next render).
    const [regen, setRegen] = useState(0);
    const generateRef = useRef(generate);
    generateRef.current = generate;
    useEffect(() => { if (regen) generateRef.current(); }, [regen]);
    const clearChip = (key: ChipKey) => {
        if (key === "trainer") rf.setTrainerSel("all");
        else if (key === "section") rf.setSecSel("all");
        else if (key === "semester") rf.setSemSel("all");
        else return;
        setRegen((n) => n + 1);
    };

    const reset = () => {
        if (defaults) {
            rf.changeBatch(defaults.batch); // also returns trainer / section / semester to "all"
            if (defaults.trainer !== "all") rf.setTrainerSel(defaults.trainer);
        }
        setSnapshot(null);
        clear();
    };
    const isDefault = !defaults || (rf.batchSel === defaults.batch && rf.trainerSel === defaults.trainer
        && rf.secSel === "all" && rf.semSel === "all");

    const wb = useMemo(
        () => (snapshot ? buildWorkbook(snapshot.feedback, snapshot.batchNameByStudent) : null),
        [snapshot],
    );

    const chips = useMemo((): ReportChip<ChipKey>[] => {
        if (!snapshot) return [];
        const out: ReportChip<ChipKey>[] = [
            { key: "batch", title: "Batch", narrowed: false, label: snapshot.batch || "No batch" },
            { key: "trainer", title: "Trainer", narrowed: snapshot.trainer !== "all", label: snapshot.trainerLabel },
        ];
        if (snapshot.isDegree) {
            out.push({ key: "section", title: "Section", narrowed: snapshot.section !== "all", label: snapshot.section === "all" ? "All Sections" : `Section ${snapshot.section}` });
            out.push({ key: "semester", title: "Semester", narrowed: snapshot.semester !== "all", label: snapshot.semester === "all" ? "All Semesters" : `Sem ${snapshot.semester}` });
        }
        return out;
    }, [snapshot]);

    const scopeLine = snapshot
        ? [
            snapshot.batch && `Batch ${snapshot.batch}`,
            `Trainer: ${snapshot.trainerLabel}`,
            snapshot.isDegree && snapshot.section !== "all" && `Section ${snapshot.section}`,
            snapshot.isDegree && snapshot.semester !== "all" && `Sem ${snapshot.semester}`,
            `Generated ${snapshot.generated}`,
        ].filter(Boolean).join("  ·  ")
        : "";

    const nudge = isFresh && Boolean(snapshot?.feedback.studentResponses?.length) && !seen;
    const fields = rf.isDegree ? 6 : 2;

    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col">
                {/* ── Heading + scope form ── */}
                <div className="no-print shrink-0">
                    <ReportHeading />
                    {/* Fixed order — Degree, Batch, Department, Section,
                        Semester, Trainer (the Feedback Report's own order). */}
                    <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${fields === 6 ? "lg:grid-cols-6" : "lg:grid-cols-4"}`}>
                        {rf.isDegree && (
                            <Field icon={GraduationCap} tone="text-violet-500" label="Degree">
                                <div className={READ_ONLY} title={rf.degree || "No degree on this course"}>{rf.degree || "—"}</div>
                            </Field>
                        )}
                        <Field icon={Layers} tone="text-brand-500" label="Batch">
                            <select aria-label="Batch" value={rf.batchSel} onChange={(e) => rf.changeBatch(e.target.value)} disabled={!rf.batchOptions.length} className={SELECT}>
                                {!rf.batchOptions.length && <option value="">No batches</option>}
                                {rf.batchOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </Field>
                        {rf.isDegree && (
                            <Field icon={BookOpen} tone="text-violet-500" label="Department">
                                <div className={READ_ONLY} title={rf.department || "No department on this course"}>{rf.department || "—"}</div>
                            </Field>
                        )}
                        {rf.isDegree && (
                            <Field icon={Rows3} tone="text-sky-500" label="Section">
                                <select aria-label="Section" value={rf.secSel} onChange={(e) => rf.setSecSel(e.target.value)} className={SELECT}>
                                    <option value="all">All sections</option>
                                    {rf.sectionOptions.map((s) => <option key={s} value={s}>Section {s}</option>)}
                                </select>
                            </Field>
                        )}
                        {rf.isDegree && (
                            <Field icon={CalendarRange} tone="text-sky-500" label="Semester">
                                <select aria-label="Semester" value={rf.semSel} onChange={(e) => rf.setSemSel(e.target.value)} className={SELECT}>
                                    <option value="all">All semesters</option>
                                    {rf.semesterOptions.map((s) => <option key={s} value={s}>Sem {s}</option>)}
                                </select>
                            </Field>
                        )}
                        <Field icon={UserRound} tone="text-emerald-500" label="Trainer">
                            <select aria-label="Trainer" value={rf.trainerSel} onChange={(e) => rf.setTrainerSel(e.target.value)} className={SELECT}>
                                <option value="all">All trainers</option>
                                {rf.trainerOptions.map((o) => <option key={o.feedbackId} value={o.feedbackId}>{o.label}</option>)}
                            </select>
                        </Field>
                    </div>
                    {rf.anonymousExcluded > 0 && (
                        <p className="mt-2 text-[11px] text-amber-600">
                            {rf.anonymousExcluded} anonymous / unmatched response{rf.anonymousExcluded === 1 ? "" : "s"} not included in this filter.
                        </p>
                    )}

                    <ReportActionRow
                        onReset={reset}
                        resetDisabled={isDefault && !snapshot}
                        onPreview={() => { markSeen(); setPreviewOpen(true); }}
                        previewDisabled={!snapshot || !wb}
                        nudge={nudge}
                        onGenerate={generate}
                        generateDisabled={!ready}
                        loading={false}
                    />
                </div>

                {/* ── The report — the Feedback Report page's own body ── */}
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-2 pr-1">
                    {!snapshot || !wb ? <ReportEmptyState /> : (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-x-4">
                                <ReportShowingRow chips={chips} onRemove={clearChip} loading={false} />
                                <p className="mb-3 text-xs text-subtle">
                                    <b className="font-semibold tabular-nums text-heading">{wb.responses.length}</b> of{" "}
                                    <b className="font-semibold tabular-nums text-heading">{snapshot.audienceCount}</b> students responded
                                </p>
                            </div>
                            {snapshot.anonymousExcluded > 0 && (
                                <p className="mb-3 text-[11px] text-amber-600">
                                    {snapshot.anonymousExcluded} anonymous / unmatched response{snapshot.anonymousExcluded === 1 ? "" : "s"} not included in this filter.
                                </p>
                            )}
                            <GeneratedReportBody
                                feedback={snapshot.feedback}
                                wb={wb}
                                audienceCount={snapshot.audienceCount}
                                notSubmitted={snapshot.notSubmitted}
                            />
                        </>
                    )}
                </div>
            </div>

            {snapshot && wb && (
                <FeedbackReportPreview
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    feedback={snapshot.feedback}
                    wb={wb}
                    audienceCount={snapshot.audienceCount}
                    notSubmitted={snapshot.notSubmitted}
                    scopeLine={scopeLine}
                />
            )}
        </>
    );
}
