// Report Analysis body — the per-form analysis the Report Analysis page
// (report/page.tsx) renders: stat cards, the Feedback Overview chart, rating
// distribution, comments, top suggestions and the Master Data / Feedback
// sheets. Lifted out of the route file VERBATIM so the L&D console's
// Feedback tab renders the identical report; a page file may only export the
// route's own fields, hence the separate module.
'use client';

import React, { useMemo } from 'react';
import {
  MessageSquare,
  Users,
  Star,
  TrendingUp,
  Lightbulb,
  Table2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Feedback } from '../types/feedback';
import { Workbook, MasterDataTable, FeedbackSheet } from './workbookShared';
import {
  FeedbackQuestionsChart,
  shortLabelsFor,
  CATEGORY_COLORS,
  type CategoryLegendEntry,
  type QuestionBar,
} from '@/app/lms/pages/courses/feedback/components/FeedbackCategoryCharts';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — strip HTML / build stats
// ─────────────────────────────────────────────────────────────────────────────
const stripHtml = (s: string) => {
  if (!s) return '';
  if (typeof window === 'undefined') return s.replace(/<[^>]*>/g, '').trim();
  const tmp = document.createElement('div');
  tmp.innerHTML = s;
  return (tmp.textContent || tmp.innerText || '').trim();
};

// All metrics derived from the feedback document so the report is self-contained.
export function buildReportStats(feedback: Feedback) {
  const questions = feedback.questions || [];
  const responses = (feedback.studentResponses || []) as any[];

  // Rating scale — derived from the questions' actual ratingConfig.maxRating.
  const maxes = questions
    .map((q) => q.ratingConfig?.maxRating)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const ratingScale = maxes.length ? Math.max(...maxes) : 5;

  // For every rating question, average its answer across all responses.
  const ratingQuestions = questions.filter((q) => q.questionType === 'rating');
  const textQuestions = questions.filter((q) => q.questionType === 'text');

  const perQuestionAvg = ratingQuestions.map((q) => {
    const vals: number[] = [];
    responses.forEach((r) => {
      const a = r.answers?.find((x: any) => x.questionText === q.questionText);
      const v = Number(a?.answer);
      if (Number.isFinite(v) && v > 0) vals.push(v);
    });
    const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return {
      question: q.questionText,
      category: (q as any).category?.trim?.() || null,
      max: q.ratingConfig?.maxRating || ratingScale,
      avg,
      n: vals.length,
    };
  });

  // Group per-question averages by category and average them.
  const categoryMap = new Map<string, { sum: number; count: number }>();
  perQuestionAvg.forEach((row) => {
    if (row.avg <= 0) return;
    const key = row.category || 'Other';
    const prev = categoryMap.get(key) || { sum: 0, count: 0 };
    prev.sum += row.avg;
    prev.count += 1;
    categoryMap.set(key, prev);
  });
  const parameterAverages = Array.from(categoryMap.entries()).map(([category, v]) => ({
    category,
    avg: v.count ? v.sum / v.count : 0,
  }));

  // Overall average across every rating answer.
  let overallSum = 0;
  let overallCount = 0;
  responses.forEach((r) => {
    r.answers?.forEach((a: any) => {
      if (a.questionType === 'rating') {
        const v = Number(a.answer);
        if (Number.isFinite(v) && v > 0) {
          overallSum += v;
          overallCount += 1;
        }
      }
    });
  });
  const overallAvg = overallCount ? overallSum / overallCount : 0;

  // Distribution of overall *response-level* average (bucketed by rounded value).
  const buckets: Record<number, number> = {};
  for (let i = 1; i <= ratingScale; i++) buckets[i] = 0;
  responses.forEach((r) => {
    const vals: number[] = [];
    r.answers?.forEach((a: any) => {
      if (a.questionType === 'rating') {
        const v = Number(a.answer);
        if (Number.isFinite(v) && v > 0) vals.push(v);
      }
    });
    if (!vals.length) return;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const rounded = Math.max(1, Math.min(ratingScale, Math.round(avg)));
    buckets[rounded] = (buckets[rounded] || 0) + 1;
  });
  const distribution = Object.entries(buckets)
    .map(([star, count]) => ({ star: Number(star), count }))
    .sort((a, b) => b.star - a.star);

  // Positive % — share of responses whose average is ≥ 70% of the scale.
  const positiveThreshold = ratingScale * 0.7;
  let positive = 0;
  responses.forEach((r) => {
    const vals: number[] = [];
    r.answers?.forEach((a: any) => {
      if (a.questionType === 'rating') {
        const v = Number(a.answer);
        if (Number.isFinite(v) && v > 0) vals.push(v);
      }
    });
    if (!vals.length) return;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (avg >= positiveThreshold) positive += 1;
  });
  const positivePct = responses.length ? Math.round((positive / responses.length) * 100) : 0;

  // Distinct students.
  const distinctStudents = new Set(
    responses.map((r) => r.studentId).filter((id) => !!id && id !== 'anonymous')
  ).size;

  // Comments: every non-empty text answer + overallReason, sorted by date desc.
  const comments: { name: string; email: string; date: string; text: string; isAnonymous: boolean }[] = [];
  responses.forEach((r) => {
    const date = r.submittedAt || '';
    r.answers?.forEach((a: any) => {
      if (a.questionType === 'text') {
        const text = stripHtml(a.answer?.toString() || '');
        if (text) {
          comments.push({
            name: r.isAnonymous ? 'Anonymous' : r.studentName || '—',
            email: r.isAnonymous ? '' : r.studentEmail || '',
            date,
            text,
            isAnonymous: !!r.isAnonymous,
          });
        }
      }
    });
    const overall = stripHtml(r.overallReason || '');
    if (overall) {
      comments.push({
        name: r.isAnonymous ? 'Anonymous' : r.studentName || '—',
        email: r.isAnonymous ? '' : r.studentEmail || '',
        date,
        text: overall,
        isAnonymous: !!r.isAnonymous,
      });
    }
  });
  comments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Top suggestions: normalize text answers and overall reasons, group by lower-cased trimmed text.
  const suggestionMap = new Map<string, { text: string; count: number }>();
  comments.forEach(({ text }) => {
    const key = text.toLowerCase().slice(0, 120);
    const prev = suggestionMap.get(key);
    if (prev) prev.count += 1;
    else suggestionMap.set(key, { text, count: 1 });
  });
  const topSuggestions = Array.from(suggestionMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Categories that (a) actually have a name and (b) contributed at least one
  // rating question. Used by the report body to decide between the
  // per-parameter radar and the per-question bar-chart fallback.
  const distinctCategoryCount = new Set(
    perQuestionAvg.map((r) => r.category).filter((c): c is string => !!c && c !== 'Other')
  ).size;

  return {
    ratingScale,
    perQuestionAvg,
    parameterAverages,
    distinctCategoryCount,
    overallAvg,
    distribution,
    positivePct,
    distinctStudents,
    suggestionsCount: suggestionMap.size,
    comments,
    topSuggestions,
    totalResponses: responses.length,
    textQuestionCount: textQuestions.length,
  };
}

export type ReportStats = ReturnType<typeof buildReportStats>;

// ─────────────────────────────────────────────────────────────────────────────
// Star row — small visual rating
// ─────────────────────────────────────────────────────────────────────────────
const StarRow: React.FC<{ value: number; max: number; size?: number }> = ({
  value,
  max,
  size = 12,
}) => {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <span className="inline-flex items-center gap-0.5">
      {stars.map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            value >= i
              ? 'text-amber-400 fill-amber-400'
              : value >= i - 0.5
              ? 'text-amber-400 fill-amber-200'
              : 'text-gray-200 dark:text-gray-700'
          }
        />
      ))}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Color palettes
// ─────────────────────────────────────────────────────────────────────────────
const STAT_TONES = [
  { fg: 'text-indigo-700', bg: 'bg-indigo-50', icon: <Users className="h-4 w-4" /> },
  { fg: 'text-emerald-700', bg: 'bg-emerald-50', icon: <Star className="h-4 w-4" /> },
  { fg: 'text-violet-700', bg: 'bg-violet-50', icon: <TrendingUp className="h-4 w-4" /> },
  { fg: 'text-amber-700', bg: 'bg-amber-50', icon: <MessageSquare className="h-4 w-4" /> },
  { fg: 'text-rose-700', bg: 'bg-rose-50', icon: <Lightbulb className="h-4 w-4" /> },
];

const DIST_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#fb923c', '#ef4444'];

// ─────────────────────────────────────────────────────────────────────────────
// Report body
// ─────────────────────────────────────────────────────────────────────────────
export const ReportAnalysisBody: React.FC<{
  feedback: Feedback;
  stats: ReportStats;
  enrolledStudents: number | null;
  wb: Workbook | null;
}> = ({ feedback, stats, enrolledStudents, wb }) => {
  const cards = [
    {
      label: 'Total Students Enrolled',
      value: enrolledStudents ?? '—',
      tone: STAT_TONES[0],
    },
    {
      label: 'Average Rating',
      value: stats.overallAvg ? `${stats.overallAvg.toFixed(2)} / ${stats.ratingScale}` : '—',
      tone: STAT_TONES[1],
    },
    { label: 'Positive Feedback', value: `${stats.positivePct}%`, tone: STAT_TONES[2] },
    { label: 'Suggestions', value: stats.suggestionsCount, tone: STAT_TONES[3] },
    { label: 'Students Responded', value: stats.distinctStudents, tone: STAT_TONES[4] },
  ];

  // Flat input for the single FeedbackQuestionsChart. Questions are pre-sorted
  // by (category, form-order-in-category) so identical colours cluster and
  // read as visual blocks in the one chart.
  const feedbackChart = useMemo(() => {
    // Preserve first-seen category order, then flatten with an index.
    const catOrder: string[] = [];
    const byCat = new Map<
      string,
      { question: string; avg: number; n: number; scale: number }[]
    >();
    stats.perQuestionAvg.forEach((r) => {
      if (r.avg <= 0) return;
      const key = r.category || 'Other';
      if (!byCat.has(key)) {
        byCat.set(key, []);
        catOrder.push(key);
      }
      byCat.get(key)!.push({
        question: r.question,
        avg: Math.round(r.avg * 100) / 100,
        n: r.n,
        scale: r.max || stats.ratingScale,
      });
    });
    // "Other" sinks to the end so named parameters lead.
    const sortedCats = [...catOrder].sort((a, b) => {
      if (a === 'Other' && b !== 'Other') return 1;
      if (b === 'Other' && a !== 'Other') return -1;
      return 0;
    });

    const questions: QuestionBar[] = [];
    const categories: CategoryLegendEntry[] = [];
    sortedCats.forEach((cat, idx) => {
      const rows = byCat.get(cat)!;
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
      categories.push({ name: cat, color });
      for (const r of rows) {
        questions.push({
          question: r.question,
          short: '', // assigned after we know the total count
          avg: r.avg,
          n: r.n,
          scale: r.scale,
          category: cat,
        });
      }
    });
    const shorts = shortLabelsFor(questions.map((q) => q.question));
    questions.forEach((q, i) => (q.short = shorts[i]));

    const scale = questions.length
      ? Math.max(...questions.map((q) => q.scale))
      : stats.ratingScale;
    const scaleMixed = new Set(questions.map((q) => q.scale)).size > 1;
    const totalN = questions.reduce((s, q) => s + q.n, 0);
    const overallAvg = totalN
      ? Math.round(
          (questions.reduce((s, q) => s + q.avg * q.n, 0) / totalN) * 100
        ) / 100
      : 0;

    return { questions, categories, scale, scaleMixed, overallAvg, totalN };
  }, [stats.perQuestionAvg, stats.ratingScale]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-3"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {c.label}
              </span>
              <div className={`p-1 rounded ${c.tone.bg} ${c.tone.fg}`}>{c.tone.icon}</div>
            </div>
            <div className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight">
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Feedback overview — ONE chart with every question as a bar, colour
          coded by parameter, long question labels truncated with "…" (hover
          for the full text). Replaces the old wide-bar Parameter/Question
          chart AND the per-parameter small-multiples grid. */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
            Feedback Overview
          </h3>
          {stats.overallAvg > 0 && (
            <span className="text-[10px] text-gray-500">
              Overall{' '}
              <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                {stats.overallAvg.toFixed(2)} / {stats.ratingScale}
              </span>
            </span>
          )}
        </div>
        <FeedbackQuestionsChart
          questions={feedbackChart.questions}
          categories={feedbackChart.categories}
          scale={feedbackChart.scale}
          scaleMixed={feedbackChart.scaleMixed}
          overallAvg={feedbackChart.overallAvg}
          totalN={feedbackChart.totalN}
          emptyLabel="No rating data yet"
        />
        <p className="text-[10px] text-gray-400 mt-3">
          Rating scale: 1 (Very Poor) – {stats.ratingScale} (Excellent) · hover any bar for the full question · dashed line marks the 70% passing threshold
        </p>
      </div>

      {/* Distribution row on its own — the parameter section above wants
          full width so the small multiples grid can breathe. */}
      <div>
        {/* Donut + distribution */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-3">
            Rating Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div className="h-48 relative">
              {stats.totalResponses === 0 ? (
                <div className="h-full flex items-center justify-center text-[12px] text-gray-400">
                  No responses yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.distribution
                          .filter((d) => d.count > 0)
                          .map((d) => ({ name: `${d.star} Stars`, value: d.count, star: d.star }))}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {stats.distribution
                          .filter((d) => d.count > 0)
                          .map((d, i) => (
                            <Cell
                              key={d.star}
                              fill={DIST_COLORS[stats.ratingScale - d.star] || DIST_COLORS[i % 5]}
                            />
                          ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-[18px] font-bold text-gray-900 dark:text-white leading-none">
                      {stats.totalResponses}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                      Responses
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              {stats.distribution.map((d, idx) => {
                const pct = stats.totalResponses
                  ? Math.round((d.count / stats.totalResponses) * 100)
                  : 0;
                const color = DIST_COLORS[stats.ratingScale - d.star] || DIST_COLORS[idx % 5];
                return (
                  <div key={d.star} className="flex items-center gap-2 text-[12px]">
                    <span className="inline-flex items-center gap-1 w-16 text-gray-700 dark:text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      {d.star} Star{d.star !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="w-14 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {pct}% ({d.count})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Average Rating
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[18px] font-bold text-gray-900 dark:text-white tabular-nums">
                {stats.overallAvg ? stats.overallAvg.toFixed(2) : '—'} / {stats.ratingScale}
              </span>
              {stats.overallAvg > 0 && (
                <StarRow value={stats.overallAvg} max={stats.ratingScale} size={14} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments + Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-3 inline-flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
            Recent Student Comments
          </h3>
          {stats.comments.length === 0 ? (
            <div className="text-[12px] text-gray-400 py-6 text-center">No comments yet</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.comments.slice(0, 5).map((c, i) => (
                <div key={i} className="py-2.5 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                    {c.isAnonymous ? 'A' : (c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-gray-900 dark:text-white truncate">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {c.date ? format(new Date(c.date), 'd MMM yyyy') : ''}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-3 inline-flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            Top Suggestions
          </h3>
          {stats.topSuggestions.length === 0 ? (
            <div className="text-[12px] text-gray-400 py-6 text-center">No suggestions yet</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.topSuggestions.map((s, i) => (
                <div key={i} className="py-2 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-gray-700 dark:text-gray-300 truncate">
                    {s.text}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0 tabular-nums">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Master Data + Feedback sheets — moved here from the Feedback Report
          page, which now shows the Consolidated Report alone. */}
      {wb && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
          <Tabs defaultValue="master" className="w-full">
            <TabsList className="inline-flex h-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 p-0.5 mb-3">
              <TabsTrigger
                value="master"
                className="inline-flex items-center gap-1 rounded px-3 py-1 text-[11px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <Table2 className="h-3 w-3" /> Master Data
              </TabsTrigger>
              <TabsTrigger
                value="feedback"
                className="inline-flex items-center gap-1 rounded px-3 py-1 text-[11px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <MessageSquare className="h-3 w-3" /> Feedback
              </TabsTrigger>
            </TabsList>

            <TabsContent value="master" className="m-0">
              <MasterDataTable wb={wb} />
            </TabsContent>
            <TabsContent value="feedback" className="m-0">
              <FeedbackSheet feedback={feedback} wb={wb} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};
