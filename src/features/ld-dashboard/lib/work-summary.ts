/** The analytics API reports scores against all assigned exercises, including unattempted work. */
export interface WorkSummary {
  attempted: number;
  total: number;
  score: number | null;
}

export function summarizeWork(stage: unknown): WorkSummary {
  let total = 0;
  let attempted = 0;
  let weightedScore = 0;
  if (stage && typeof stage === "object") {
    for (const category of Object.values(stage)) {
      if (!category || typeof category !== "object") continue;
      const item = category as Record<string, unknown>;
      const denominator = Number(item.total);
      if (!Number.isFinite(denominator) || denominator <= 0) continue;
      total += denominator;
      attempted += Math.max(0, Math.min(denominator, Number(item.completed) || 0));
      const percentage = Number(item.percentage);
      weightedScore += (Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0) * denominator;
    }
  }
  return { total, attempted, score: total > 0 && attempted > 0 ? Math.round(weightedScore / total) : null };
}

export function combineWork(items: (WorkSummary | undefined)[]): WorkSummary {
  const total = items.reduce((sum, item) => sum + (item?.total ?? 0), 0);
  const attempted = items.reduce((sum, item) => sum + (item?.attempted ?? 0), 0);
  const weightedScore = items.reduce((sum, item) => sum + (item?.score ?? 0) * (item?.total ?? 0), 0);
  return { total, attempted, score: total > 0 && attempted > 0 ? Math.round(weightedScore / total) : null };
}

export interface WorkCategory extends WorkSummary {
  name: string;
}

/** Preserve configured category names; no assignment/assessment name assumptions. */
export function summarizeCategories(stage: unknown): WorkCategory[] {
  if (!stage || typeof stage !== "object") return [];
  return Object.entries(stage).map(([name, category]) => ({ name, ...summarizeWork({ [name]: category }) }));
}

export function combineCategories(groups: (WorkCategory[] | undefined)[]): WorkCategory[] {
  const categories = new Map<string, WorkSummary[]>();
  for (const group of groups) {
    for (const category of group ?? []) {
      const items = categories.get(category.name) ?? [];
      items.push(category);
      categories.set(category.name, items);
    }
  }
  return Array.from(categories, ([name, items]) => ({ name, ...combineWork(items) }));
}
