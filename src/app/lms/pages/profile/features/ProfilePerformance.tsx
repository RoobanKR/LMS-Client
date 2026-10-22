"use client"

// The Performance tab — the student dashboard's own metrics (buildDashboard),
// laid out for reading: headline numbers, the I Do → We Do → You Do journey,
// every course with where its figure comes from, momentum and insights.

import {
  Activity, Award, BookOpen, Calendar, CheckCircle, ChevronRight, Clock, Flame, Lightbulb,
  Route, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  shortDuration,
  type CourseModel,
  type DashboardModel,
  type StageStats,
} from "@/app/lms/pages/studentdashboard/_lib/metrics"
import { ACCENT_TEXT, Chip, EmptyState, Meter, PButton, Panel, Skeleton, fmtDate } from "./profileUi"

function MetricTile({ icon: Icon, label, value, sub, pct }: {
  icon: React.ElementType; label: string; value: string; sub: string; pct: number | null
}) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-subtle">
        <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", ACCENT_TEXT)} />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 text-2xl font-semibold leading-tight tabular-nums text-heading">{value}</p>
      <p className="mt-0.5 truncate text-xs text-subtle">{sub}</p>
      {pct !== null && <Meter pct={pct} className="mt-3" />}
    </div>
  )
}

/** The four cells every graded stage (We Do / You Do) reports. */
function stageCells(s: StageStats) {
  return [
    { label: "Exercises", value: `${s.submitted}/${s.assigned}`, sub: "submitted" },
    { label: "Questions", value: `${s.questionsSolved}/${s.questionsTotal}`, sub: "solved" },
    { label: "Attempted", value: `${s.questionsAttempted}/${s.questionsTotal}`, sub: "questions tried" },
    {
      label: "Score",
      value: s.scorePct === null ? "—" : `${s.scorePct}%`,
      sub: s.scorePct === null ? "not graded yet" : `${s.scoreObtained}/${s.scoreMax} marks`,
    },
  ]
}

function StageRow({ title, hasContent, pct, meterLabel, cells }: {
  title: string; hasContent: boolean; pct: number
  /** What the header meter is a percentage OF. */
  meterLabel: string
  cells: { label: string; value: string; sub: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline">
      <div className="flex flex-col items-start gap-1.5 border-b border-hairline bg-surface-sunken/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h3 className="min-w-0 max-w-full truncate text-[13px] font-semibold text-heading">{title}</h3>
        {hasContent ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <Meter pct={pct} className="w-24" />
            <span className="text-xs font-semibold tabular-nums text-heading">{pct}%</span>
            <span className="text-xs text-subtle">{meterLabel}</span>
          </div>
        ) : (
          <span className="flex-shrink-0 text-xs text-subtle">Nothing set up yet</span>
        )}
      </div>
      {hasContent && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-4">
          {cells.map((c) => (
            <div key={c.label} className="min-w-0">
              <p className="text-xs text-subtle">{c.label}</p>
              <p className="mt-0.5 text-base font-semibold leading-tight tabular-nums text-heading">{c.value}</p>
              <p className="text-xs text-subtle">{c.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const courseStatus = (c: CourseModel) => {
  const p = Math.round(c.progress)
  return p >= 100 ? "Completed" : p > 0 || c.hasActivity ? "In progress" : "Not started"
}

function CourseRow({ course, onOpen }: { course: CourseModel; onOpen: (c: CourseModel) => void }) {
  const p = Math.max(0, Math.min(100, Math.round(course.progress)))
  const status = courseStatus(course)
  const stages = [
    { label: "I Do", on: course.learn.hasContent, pct: course.learn.completionPct, detail: `${course.learn.opened}/${course.learn.total}` },
    { label: "We Do", on: course.practice.hasContent, pct: course.practice.completionPct, detail: `${course.practice.started}/${course.practice.assigned}` },
    { label: "You Do", on: course.assess.hasContent, pct: course.assess.completionPct, detail: `${course.assess.started}/${course.assess.assigned}` },
  ].filter((s) => s.on)

  return (
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="group block w-full rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-[#faf9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47e0]/30 dark:hover:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">{course.name}</p>
          {(course.code || course.level) && (
            <p className="mt-0.5 truncate text-xs text-subtle">{[course.code, course.level].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Chip tone={status === "Completed" ? "success" : status === "In progress" ? "accent" : "neutral"}>{status}</Chip>
          <span className="w-10 text-right text-sm font-semibold tabular-nums text-heading">{p}%</span>
          <ChevronRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
      <Meter pct={p} className="mt-2.5" />
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-subtle">
        {stages.map((s) => (
          <span key={s.label}>
            {s.label} <span className="font-medium tabular-nums text-body">{s.pct}%</span> ({s.detail})
          </span>
        ))}
        <span>Last opened {course.lastAccessed ? fmtDate(course.lastAccessed) : "never"}</span>
        {course.scorePct !== null && <span>Score <span className="font-medium tabular-nums text-body">{course.scorePct}%</span></span>}
      </div>
    </button>
  )
}

export function PerformanceTab({ performance, loading, onOpenCourse, onBrowseCourses }: {
  performance: DashboardModel | null; loading: boolean
  onOpenCourse: (c: CourseModel) => void; onBrowseCourses: () => void
}) {
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-hairline p-4">
              <Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-7 w-16" /><Skeleton className="mt-3 h-1.5 w-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-hairline p-5"><Skeleton className="h-4 w-40" /><Skeleton className="mt-4 h-24 w-full" /></div>
      </div>
    )
  }

  if (!performance || performance.courses.length === 0) {
    return (
      <Panel icon={TrendingUp} title="Performance">
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          text="Your progress, scores and attendance appear here once you're enrolled and start learning."
          action={<PButton size="sm" variant="primary" onClick={onBrowseCourses}>Go to my courses</PButton>}
        />
      </Panel>
    )
  }

  const p = performance
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={TrendingUp} label="Overall progress" value={`${p.overallProgress}%`}
          sub={`${p.inProgress} in progress · ${p.completed} completed`} pct={p.overallProgress}
        />
        <MetricTile
          icon={Award} label="Grade"
          value={p.scorePct === null ? "—" : p.grade.letter}
          sub={p.scorePct === null ? "Nothing graded yet" : `${p.scorePct}% · ${p.grade.caption}`}
          pct={p.scorePct}
        />
        <MetricTile
          icon={CheckCircle} label="Attendance"
          value={p.attendance.pct === null ? "—" : `${p.attendance.pct}%`}
          sub={p.attendance.hasData ? `${p.attendance.present} present of ${p.attendance.totalDays} days` : "Not marked yet"}
          pct={p.attendance.pct}
        />
        <MetricTile
          icon={Clock} label="Study time"
          value={p.time.tracked ? shortDuration(p.time.totalSeconds) : "—"}
          sub={p.time.tracked ? `${shortDuration(p.time.exerciseSeconds)} on exercises` : "No measured sessions yet"}
          pct={null}
        />
      </div>

      <Panel icon={BookOpen} title="Course progress" subtitle="Select a course to open it" bodyClassName="px-2 py-2">
        <div className="divide-y divide-hairline">
          {p.courses.map((c, i) => <CourseRow key={c.id || i} course={c} onOpen={onOpenCourse} />)}
        </div>
      </Panel>

      <Panel icon={Route} title="Learning journey" subtitle="I Do → We Do → You Do, across all your courses">
        <div className="space-y-3">
          <StageRow
            title="I Do · Learning resources"
            hasContent={p.totals.learn.hasContent}
            pct={p.totals.learn.completionPct}
            meterLabel="opened"
            cells={[
              { label: "Resources", value: `${p.totals.learn.opened}/${p.totals.learn.total}`, sub: "opened" },
              { label: "Checkpoints", value: `${p.totals.learn.mcqCompleted}/${p.totals.learn.mcqDocs}`, sub: "completed" },
              { label: "Content", value: `${Math.round(p.totals.learn.completedMinutes)}/${p.totals.learn.contentMinutes}`, sub: "minutes" },
              { label: "Done", value: `${p.totals.learn.completionPct}%`, sub: "of resources" },
            ]}
          />
          <StageRow
            title="We Do · Assignments"
            hasContent={p.totals.practice.hasContent}
            pct={p.totals.practice.completionPct}
            meterLabel="started"
            cells={stageCells(p.totals.practice)}
          />
          <StageRow
            title="You Do · Assessments"
            hasContent={p.totals.assess.hasContent}
            pct={p.totals.assess.completionPct}
            meterLabel="started"
            cells={stageCells(p.totals.assess)}
          />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={Flame} title="Learning activity">
          <div className="grid grid-cols-2 gap-3">
            <MetricTile icon={Flame} label="Current streak" value={`${p.momentum.streak}`} sub={p.momentum.streak === 1 ? "day in a row" : "days in a row"} pct={null} />
            <MetricTile icon={Activity} label="Active days" value={`${p.momentum.activeDays30}`} sub="in the last 30 days" pct={null} />
            <MetricTile
              icon={CheckCircle} label="Solved this month" value={`${p.solvedThisMonth}`}
              sub={p.monthDeltaPct === null ? "no earlier month to compare" : `${p.monthDeltaPct >= 0 ? "+" : ""}${p.monthDeltaPct}% vs previous 30 days`}
              pct={null}
            />
            <MetricTile icon={Calendar} label="Due this week" value={`${p.pendingThisWeek}`} sub="pending deadlines" pct={null} />
          </div>
        </Panel>

        <Panel icon={Lightbulb} title="Insights">
          {p.insights.length > 0 ? (
            <ul className="divide-y divide-hairline">
              {p.insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <span className={cn(
                    "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                    ins.tone === "good" ? "bg-emerald-500" : ins.tone === "warn" ? "bg-amber-500" : "bg-[#5b47e0]",
                  )} />
                  <p className="text-[13px] leading-relaxed text-body">{ins.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-subtle">Insights appear as you complete more work.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
