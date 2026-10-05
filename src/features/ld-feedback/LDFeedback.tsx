"use client";

import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { FbFormRow } from "@/app/lms/pages/lddashboard/FeedbackReportDesignerModal";
import type { Feedback } from "@/app/lms/pages/coursestructure/feedback/types/feedback";
import FeedbackFormList, { type FormTab } from "./FeedbackFormList";
import FeedbackFormPage from "./FeedbackFormPage";
import { toFeedbackRow, type FeedbackRow } from "./lib";

/* Loaded on demand — both ship exceljs + jspdf, which must not join the
 * console's initial bundle. Neither is changed: the designer pools the
 * listed forms exactly as before, and its per-form Open still launches the
 * per-form responses export. */
const FeedbackReportDesignerModal = dynamic(
    () => import("@/app/lms/pages/lddashboard/FeedbackReportDesignerModal"),
    { ssr: false },
);
const FeedbackFormReportModal = dynamic(
    () => import("@/app/lms/pages/coursestructure/feedback/report/FeedbackReportExportModal"),
    { ssr: false },
);

/* The L&D console's Feedback view: the form list, and — once a form is
 * opened — that form's Feedback / Report page in its place. The URL stays
 * at #fb-summary throughout; the console owns the screen. */

export type FeedbackScope = {
    /** Console-level client / course pick ("all" when none). */
    client: string;
    course: string;
};

export function LDFeedback({ forms, loading, error, onRetry, scope, header }: {
    /** One row per form, built (and institution-scoped) by the console. */
    forms: FbFormRow[] | undefined;
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    scope: FeedbackScope;
    /** The console's page heading, shown above the list only. */
    header: ReactNode;
}) {
    const rows = useMemo<FeedbackRow[] | undefined>(() => {
        if (!forms) return undefined;
        const now = Date.now();
        return forms.map((f) => toFeedbackRow(f, now));
    }, [forms]);

    const [open, setOpen] = useState<{ id: string; tab: FormTab } | null>(null);
    const [designer, setDesigner] = useState<{ forms: FeedbackRow[]; scopeLabel: string } | null>(null);
    // The raw form the per-form export modal is open on (from the designer).
    const [exportDoc, setExportDoc] = useState<Feedback | null>(null);

    const openRow = open ? rows?.find((r) => r.id === open.id) : undefined;
    if (openRow && open) {
        return (
            <FeedbackFormPage
                row={openRow}
                tab={open.tab}
                onTab={(tab) => setOpen({ id: openRow.id, tab })}
                onBack={() => setOpen(null)}
            />
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {header}
            <FeedbackFormList
                rows={rows}
                loading={loading}
                error={error}
                onRetry={onRetry}
                onOpen={(row, tab) => setOpen({ id: row.id, tab })}
                onDetailedReport={(listed, scopeLabel) => setDesigner({ forms: listed, scopeLabel })}
                initialClients={scope.client !== "all" ? [scope.client] : []}
                initialCourses={scope.course !== "all" ? [scope.course] : []}
            />
            {designer && (
                <FeedbackReportDesignerModal
                    open
                    onClose={() => setDesigner(null)}
                    forms={designer.forms}
                    scopeLabel={designer.scopeLabel}
                    onOpenForm={(raw) => setExportDoc(raw as Feedback)}
                />
            )}
            {/* Portal-rendered; keyed by form so its filters / column picks reset per doc. */}
            {exportDoc && (
                <FeedbackFormReportModal
                    key={String(exportDoc._id)}
                    open
                    onClose={() => setExportDoc(null)}
                    feedback={exportDoc}
                />
            )}
        </div>
    );
}

export default LDFeedback;
