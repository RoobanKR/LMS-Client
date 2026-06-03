import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import {
  LANGUAGE_CONFIG,
  STARTER_CODE,
  TS_CONFIG_JSON,
  launchConfigFor,
  normalizeLanguage,
  detectLanguageFromFilename,
  type SupportedLanguage,
} from "@/lib/codeLanguages"

export const dynamic = "force-dynamic"

// The workspace folder is the SAME directory bind-mounted into the code-server
// container (-v ./workspace:/home/coder/project). Next.js runs with cwd = client/,
// so the repo's workspace/ is one level up. Override with WORKSPACE_DIR if needed.
const WORKSPACE_DIR =
  process.env.WORKSPACE_DIR || path.resolve(process.cwd(), "..", "workspace")

const SKIP_DIRS = new Set([".vscode", "node_modules", ".git", "__pycache__", "_review"])
const SKIP_FILES = new Set([".DS_Store", "tsconfig.json", ".gitignore", "go.mod", "go.sum"])
const MAX_FILE_BYTES = 256 * 1024

// Extensions that "belong to" each selected language (kept during prune).
const LANG_EXTS: Record<SupportedLanguage, string[]> = {
  python: ["py", "pyw"],
  javascript: ["js", "mjs", "cjs", "jsx"],
  typescript: ["ts", "tsx"],
  java: ["java"],
  cpp: ["cpp", "cc", "cxx", "hpp", "hh", "h"],
  c: ["c", "h"],
  go: ["go"],
}
// Recognized code/source extensions we actively police. A file with one of these
// that doesn't belong to the selected language is removed; non-code/data files
// (txt, csv, json, md, images, …) are left untouched.
const POLICED_EXTS = new Set([
  "html", "htm", "css", "scss", "sass", "less",
  "js", "mjs", "cjs", "jsx", "ts", "tsx",
  "py", "pyw", "java", "cpp", "cc", "cxx", "hpp", "hh", "c", "h",
  "go", "rb", "php", "cs", "rs", "swift", "kt", "kts", "dart", "scala",
])

const isInside = (root: string, target: string) => {
  const rel = path.relative(root, target)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

// Resolve an optional subfolder safely inside the workspace (used for staff review
// folders like _review/<id> so they never clobber a student's root workspace).
const resolveBaseDir = (subdir?: string): string => {
  if (!subdir) return WORKSPACE_DIR
  const clean = String(subdir).replace(/^[/\\]+/, "").replace(/\.\.[/\\]/g, "")
  const dir = path.join(WORKSPACE_DIR, clean)
  return isInside(WORKSPACE_DIR, dir) ? dir : WORKSPACE_DIR
}

// Recursively read all readable text files under `baseDir` (paths relative to it).
async function readFilesIn(baseDir: string): Promise<
  Array<{ filename: string; path: string; folderPath: string; content: string; language: string; isEntryPoint: boolean }>
> {
  const out: any[] = []
  const walk = async (dir: string) => {
    let entries: any[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.isDirectory()) continue
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue
        await walk(path.join(dir, e.name))
        continue
      }
      if (SKIP_FILES.has(e.name)) continue
      const full = path.join(dir, e.name)
      try {
        const stat = await fs.stat(full)
        if (stat.size > MAX_FILE_BYTES) continue
        const content = await fs.readFile(full, "utf8")
        const relDir = path.relative(baseDir, dir).split(path.sep).join("/")
        const folderPath = relDir ? `/${relDir}` : "/"
        const relPath = path.relative(baseDir, full).split(path.sep).join("/")
        out.push({
          filename: e.name,
          path: `/${relPath}`,
          folderPath,
          content,
          language: detectLanguageFromFilename(e.name),
          isEntryPoint: /^(main\.|Main\.)/.test(e.name),
        })
      } catch {
        /* skip unreadable / binary */
      }
    }
  }
  await walk(baseDir)
  return out
}

async function clearDir(baseDir: string, preserve: Set<string> = new Set()) {
  let entries: any[]
  try {
    entries = await fs.readdir(baseDir, { withFileTypes: true })
  } catch {
    await fs.mkdir(baseDir, { recursive: true })
    return
  }
  await Promise.all(
    entries
      .filter((e) => !preserve.has(e.name))
      .map((e) => fs.rm(path.join(baseDir, e.name), { recursive: true, force: true })),
  )
}

async function writeLaunchJson(baseDir: string, langs: SupportedLanguage[]) {
  const vscodeDir = path.join(baseDir, ".vscode")
  await fs.mkdir(vscodeDir, { recursive: true })
  const configurations = langs.map(launchConfigFor)
  await fs.writeFile(
    path.join(vscodeDir, "launch.json"),
    JSON.stringify({ version: "0.2.0", configurations }, null, 2),
    "utf8",
  )
}

// Auto-save so the student's edits reach disk (and thus submissions) without Ctrl+S.
async function writeSettingsJson(baseDir: string, autoSave: boolean) {
  const vscodeDir = path.join(baseDir, ".vscode")
  await fs.mkdir(vscodeDir, { recursive: true })
  await fs.writeFile(
    path.join(vscodeDir, "settings.json"),
    JSON.stringify(
      autoSave
        ? {
            "files.autoSave": "afterDelay",
            "files.autoSaveDelay": 700,
            // Hide staff review folders from the student's VS Code explorer.
            "files.exclude": { "_review": true },
          }
        : {},
      null,
      2,
    ),
    "utf8",
  )
}

// Write explicit file contents (restore a submission / seed a review folder).
async function writeFiles(baseDir: string, files: Array<{ filename?: string; path?: string; content?: string }>) {
  for (const f of files) {
    const rel = (f.path || f.filename || "").replace(/^\/+/, "")
    if (!rel) continue
    const target = path.join(baseDir, rel)
    if (!isInside(baseDir, target)) continue
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, f.content ?? "", "utf8")
  }
}

// Ensure the starter file for `lang` exists (does not overwrite existing edits).
async function ensureLanguageFile(baseDir: string, lang: SupportedLanguage) {
  const cfg = LANGUAGE_CONFIG[lang]
  const target = path.join(baseDir, cfg.filename)
  try {
    await fs.access(target)
  } catch {
    await fs.writeFile(target, STARTER_CODE[lang], "utf8")
  }
  if (lang === "typescript") {
    const tsconfig = path.join(baseDir, "tsconfig.json")
    try { await fs.access(tsconfig) } catch { await fs.writeFile(tsconfig, TS_CONFIG_JSON, "utf8") }
  }
}

const langsFromFiles = (files: Array<{ filename?: string }>): SupportedLanguage[] => {
  const set = new Set<SupportedLanguage>()
  for (const f of files) {
    const l = detectLanguageFromFilename(f.filename || "")
    if (l !== "text") set.add(l)
  }
  return [...set]
}

// ── GET: read the real files the student edited in code-server ──────────────
// optional ?subdir=_review/<id> to read a specific review folder
export async function GET(req: NextRequest) {
  try {
    const subdir = req.nextUrl.searchParams.get("subdir") || undefined
    const baseDir = resolveBaseDir(subdir)
    const files = await readFilesIn(baseDir)
    return NextResponse.json({ ok: true, files, baseDir })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "read failed" }, { status: 500 })
  }
}

// ── POST: prepare a workspace (student root) or a review subfolder ───────────
// body: { languages?: string[], active?: string, files?: [{path,content}], subdir?: string }
//   subdir present (+ files) → REVIEW: clear that subfolder and write the
//        submission into it (read-only viewing), auto-save OFF.
//   files present (no subdir) → student RESTORE (clear root + write), auto-save ON.
//   files absent (no subdir)  → student SEED (ensure starter, no clear), auto-save ON.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const subdir: string | undefined = body.subdir || undefined
    // A "review" subdir always starts with "_review/" (staff viewing a submission).
    // Student subdirs start with "student-" and are treated as normal live workspaces.
    const isReview = !!subdir && subdir.startsWith("_review")
    const baseDir = resolveBaseDir(subdir)

    // ── Prune mode: delete files that don't match the allowed language ──────────
    // Used to enforce "only the selected language's files" in the live workspace.
    // Only removes files that are a DIFFERENT recognized programming language
    // (e.g. .html / .cpp when Python is selected). Leaves plain data files alone.
    if (body.prune) {
      const allowed = normalizeLanguage(body.prune)
      const allowedExts = allowed ? LANG_EXTS[allowed] : []
      const existing = await readFilesIn(baseDir)
      const removed: string[] = []
      if (allowed) {
        for (const f of existing) {
          const ext = (f.filename.split(".").pop() || "").toLowerCase()
          // Remove only recognized source files that belong to a different language.
          if (POLICED_EXTS.has(ext) && !allowedExts.includes(ext)) {
            const target = path.join(baseDir, f.path.replace(/^\/+/, ""))
            if (isInside(baseDir, target)) {
              try { await fs.rm(target, { force: true }); removed.push(f.filename) } catch { /* */ }
            }
          }
        }
      }
      const files = await readFilesIn(baseDir)
      return NextResponse.json({ ok: true, pruned: true, removed, files })
    }

    // ── Add mode: create new file(s) WITHOUT wiping the folder ──────────────────
    // Used by the LMS "New File" button. Enforces the selected language's
    // extension on the client; here we just write what we're given (no clear).
    if (body.add && Array.isArray(body.files) && body.files.length > 0) {
      await fs.mkdir(baseDir, { recursive: true })
      const created: string[] = []
      const skipped: string[] = []
      for (const f of body.files as Array<{ filename?: string; path?: string; content?: string }>) {
        const rel = (f.path || f.filename || "").replace(/^\/+/, "")
        if (!rel) continue
        const target = path.join(baseDir, rel)
        if (!isInside(baseDir, target)) continue
        // Don't overwrite an existing file — report it as skipped instead.
        try { await fs.access(target); skipped.push(rel); continue } catch { /* doesn't exist → create */ }
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, f.content ?? "", "utf8")
        created.push(rel)
      }
      const files = await readFilesIn(baseDir)
      return NextResponse.json({ ok: true, added: true, created, skipped, files })
    }

    const restoreFiles: Array<{ filename?: string; path?: string; content?: string }> | null =
      Array.isArray(body.files) && body.files.length > 0 ? body.files : null

    const rawLangs: string[] = Array.isArray(body.languages)
      ? body.languages
      : body.language
        ? [body.language]
        : []
    let langs = rawLangs
      .map(normalizeLanguage)
      .filter((l): l is SupportedLanguage => !!l)

    // For review folders, derive languages from the submitted files if not given.
    if (langs.length === 0 && restoreFiles) langs = langsFromFiles(restoreFiles)
    if (langs.length === 0) langs = ["python"]

    const active = normalizeLanguage(body.active || "") || langs[0]

    await fs.mkdir(baseDir, { recursive: true })

    if (isReview) {
      // Staff review: isolated folder, always replace with the submission's files.
      await clearDir(baseDir)
      if (restoreFiles) await writeFiles(baseDir, restoreFiles)
    } else if (restoreFiles) {
      // Student restore (root or per-student subdir): clear and write exact files.
      // We never need to preserve _review here — review folders are always siblings
      // at the workspace root, never nested inside a student-<id> folder.
      await clearDir(baseDir)
      await writeFiles(baseDir, restoreFiles)
      if (active === "typescript") {
        const tsconfig = path.join(baseDir, "tsconfig.json")
        try { await fs.access(tsconfig) } catch { await fs.writeFile(tsconfig, TS_CONFIG_JSON, "utf8") }
      }
    } else {
      // Student seed: create the starter only if missing (never wipe edits).
      await ensureLanguageFile(baseDir, active)
    }

    await writeLaunchJson(baseDir, langs)
    await writeSettingsJson(baseDir, !isReview) // auto-save only for the live student workspace

    const files = await readFilesIn(baseDir)
    return NextResponse.json({ ok: true, review: isReview, seeded: [active], restored: !!restoreFiles, files })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "prepare failed" }, { status: 500 })
  }
}
