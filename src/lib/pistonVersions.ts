// Per-exercise language versions.
//
// Exercise Settings stores the Piston version a trainer picked for each
// language in `programmingSettings.languageVersions` (e.g. { java: '21.0.12' }).
// Every code runner applies it over its default pin; a language without a
// pick keeps the default. The server judge reads the same field for Submit.

import { API_ORIGIN } from '@/lib/apiBase'
import { getToken } from '@/lib/session'

const LANGUAGE_KEYS: Record<string, string> = {
  python: 'python', py: 'python', python3: 'python',
  javascript: 'javascript', js: 'javascript', node: 'javascript', nodejs: 'javascript',
  typescript: 'typescript', ts: 'typescript',
  java: 'java',
  cpp: 'cpp', 'c++': 'cpp', cplusplus: 'cpp',
  c: 'c',
  go: 'go', golang: 'go',
  csharp: 'csharp', 'c#': 'csharp', cs: 'csharp',
}

/** "Java" / "C++" / "c#" → "java" / "cpp" / "csharp"; '' for a language Piston doesn't run. */
export function pistonLanguageKey(lang?: string | null): string {
  return LANGUAGE_KEYS[String(lang || '').trim().toLowerCase()] || ''
}

const VERSION_RE = /^\d+(\.\d+){0,3}$/

/** The version the exercise picked for `lang`, or undefined for the default. */
export function exerciseLanguageVersion(exercise: any, lang?: string | null): string | undefined {
  const map = exercise?.programmingSettings?.languageVersions
  const v = map && typeof map === 'object' ? map[pistonLanguageKey(lang)] : undefined
  return typeof v === 'string' && VERSION_RE.test(v) ? v : undefined
}

/** `cfg` with the exercise's version for `lang` in place of its default pin. */
export function withExerciseVersion<T extends { version: string }>(cfg: T, exercise: any, lang?: string | null): T {
  const v = exerciseLanguageVersion(exercise, lang)
  return v ? { ...cfg, version: v } : cfg
}

export interface InstalledRuntimes {
  /** Installed versions per language key, newest first. */
  versions: Record<string, string[]>
  /** The version a language runs on when the exercise picks none. */
  defaults: Record<string, string>
}

/** The versions installed in Piston (GET /api/run/runtimes). */
export async function fetchInstalledRuntimes(signal?: AbortSignal): Promise<InstalledRuntimes> {
  const res = await fetch(`${API_ORIGIN}/api/run/runtimes`, {
    headers: { Authorization: `Bearer ${getToken() || ''}` },
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return { versions: data?.versions || {}, defaults: data?.defaults || {} }
}
