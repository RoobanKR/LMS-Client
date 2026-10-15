// What kind of activity a (tab, subcategory) pair is.
//
// You Do > Practice works exactly like We Do > Assignment - same Exercise
// Settings, same question authoring, same student list and editor, same
// submission rules - and differs only in its name. Every place that would
// otherwise test `tab === 'We_Do'` for "assignment-style" behaviour asks
// `isAssignmentStyle(tab, sub)` instead, and every label asks `activityNoun`.

/** Subcategory key the way both the trainer and student pages derive it ("Practice" → "practice"). */
export const subcategoryKey = (sub: unknown): string =>
  String(sub ?? '').trim().toLowerCase().replace(/\s+/g, '_')

/** You Do > Practice. */
export const isPractice = (tab: unknown, sub: unknown): boolean =>
  /^you[\s_-]?do$/i.test(String(tab ?? '')) && subcategoryKey(sub) === 'practice'

/** We Do (assignments), or You Do > Practice, which behaves exactly like one. */
export const isAssignmentStyle = (tab: unknown, sub: unknown): boolean =>
  /^we[\s_-]?do$/i.test(String(tab ?? '')) || isPractice(tab, sub)

/** "assignment" / "practice" / "assessment" / "exercise" - lowercase; capitalise where needed. */
export const activityNoun = (tab: unknown, sub: unknown): 'assignment' | 'practice' | 'assessment' | 'exercise' => {
  if (isPractice(tab, sub)) return 'practice'
  const t = String(tab ?? '')
  if (/^we[\s_-]?do$/i.test(t)) return 'assignment'
  if (/^you[\s_-]?do$/i.test(t)) return 'assessment'
  return 'exercise'
}

export const capitalizeNoun = (noun: string): string => noun.charAt(0).toUpperCase() + noun.slice(1)
