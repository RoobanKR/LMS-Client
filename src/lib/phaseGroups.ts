// Grouping a phased course's modules under their phases, for the syllabus
// sidebars (student course page and trainer Upload Resources).
//
// A placement course runs in phases and each phase has its own modules, stored
// on the module by phase NAME ("Phase I"). "" means the module was built before
// phases existed; Course Structure shows those under the FIRST phase, and so do
// the sidebars. A course where nothing names a phase is unphased: callers get
// null and keep their flat module list.

const PHASE_ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 }

/** "Phase II" → 2, "Phase 3" → 3; anything else sorts after, in arrival order. */
export const phaseOrdinal = (name: string): number => {
  const m = name.trim().toLowerCase().match(/(\d+|[ivx]+)$/)
  if (!m) return Infinity
  return /\d/.test(m[1]) ? Number(m[1]) : (PHASE_ROMAN[m[1]] ?? Infinity)
}

export interface PhaseGroup<T> {
  name: string
  items: T[]
}

/**
 * `items` grouped by phase, phases in order (I, II, III …), empty phases left
 * out. `knownPhases` adds phase names that may have no module yet (the course's
 * configured / batch phases), so a pre-phase module still lands under the true
 * first phase. `hiddenPhases` (Service Mapping's "Hide" box) are dropped with
 * their items — after the grouping, so a hidden first phase also takes the
 * pre-phase modules filed under it.
 */
export function groupByPhase<T>(
  items: T[],
  phaseOf: (item: T) => unknown,
  knownPhases: unknown[] = [],
  hiddenPhases: unknown[] = [],
): PhaseGroup<T>[] | null {
  const names = new Map<string, string>() // lower-cased → first spelling seen
  const add = (v: unknown) => {
    const n = String(v ?? '').trim()
    if (n && !names.has(n.toLowerCase())) names.set(n.toLowerCase(), n)
  }
  knownPhases.forEach(add)
  hiddenPhases.forEach(add)
  items.forEach((item) => add(phaseOf(item)))
  if (!names.size) return null

  const groups: PhaseGroup<T>[] = [...names.values()]
    .map((name, i) => ({ name, i }))
    .sort((a, b) => (phaseOrdinal(a.name) - phaseOrdinal(b.name)) || a.i - b.i)
    .map(({ name }) => ({ name, items: [] }))
  for (const item of items) {
    const key = String(phaseOf(item) ?? '').trim().toLowerCase()
    ;(groups.find((g) => g.name.toLowerCase() === key) || groups[0]).items.push(item)
  }
  const hidden = new Set(hiddenPhases.map((v) => String(v ?? '').trim().toLowerCase()))
  return groups.filter((g) => g.items.length && !hidden.has(g.name.toLowerCase()))
}
