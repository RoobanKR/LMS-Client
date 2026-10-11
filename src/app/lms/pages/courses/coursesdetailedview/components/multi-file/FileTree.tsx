"use client"

import { useMemo, useState } from "react"
import {
  ChevronRight, ChevronDown, File as FileIcon, FileCode2, FileText, Folder, FolderOpen,
  FilePlus, FolderPlus, Pencil, Trash2,
} from "lucide-react"
import { LANGUAGE_CONFIG } from "@/lib/codeLanguages"
import { type FileNode, type FolderNode, normPath, joinPath } from "./types"

type DragItem = { kind: "file" | "folder"; path: string }
type Creating = { parent: string; kind: "file" | "folder" } | null
type Renaming = { id: string; kind: "file" | "folder" } | null

interface FileTreeProps {
  files: FileNode[]
  folders: FolderNode[]
  activeFileId: string | null
  busy?: boolean
  onOpenFile: (id: string) => void
  // Inline editing — these receive the typed name directly (no prompt()).
  onCreateFile: (parentFolderPath: string, name: string) => void
  onCreateFolder: (parentFolderPath: string, name: string) => void
  onRenameFile: (file: FileNode, newName: string) => void
  onRenameFolder: (folder: FolderNode, newName: string) => void
  onDeleteFile: (file: FileNode) => void
  onDeleteFolder: (folder: FolderNode) => void
  onMove: (item: DragItem, targetFolderPath: string) => void
  // Optional: parent can suggest a folder context (e.g. the folder of the
  // currently active file) so the toolbar's + buttons target the right place
  // even when the user hasn't clicked a folder yet.
  defaultTargetFolder?: string
  // Files the program created on Run. Listed in their own read-only section
  // (open only — no rename, delete or drag).
  outputFiles?: FileNode[]
  // Shown as the collapsible project root row (e.g. "PYTHONEX-1"), like
  // VS Code's workspace folder. Without it the tree starts at its items.
  projectName?: string
}

// Light workspace palette: navy text, warm-gray hover, soft teal selection.
const C = {
  navy: "#101B3B",
  text: "#344054",
  muted: "#667085",
  icon: "#475467",
  hover: "hover:bg-[#F5F4F0]",
  selected: "#E3F4EF",
  folderSelected: "#F2F1ED",
  dropTarget: "#E3F4EF",
  border: "#E7E5DF",
}

const fileColor = (lang: FileNode["language"]): string =>
  lang !== "text" ? LANGUAGE_CONFIG[lang]?.color || C.icon : C.icon

// Code files get the code glyph in their language colour; anything else
// (data, notes) a plain document glyph.
const FileGlyph = ({ file }: { file: FileNode }) =>
  file.language !== "text"
    ? <FileCode2 size={15} style={{ color: fileColor(file.language), flexShrink: 0 }} />
    : <FileText size={15} style={{ color: C.icon, flexShrink: 0 }} />

export default function FileTree(props: FileTreeProps) {
  const {
    files, folders, activeFileId, busy, defaultTargetFolder,
    onOpenFile, onCreateFile, onCreateFolder,
    onRenameFile, onRenameFolder, onDeleteFile, onDeleteFolder, onMove,
    outputFiles = [], projectName,
  } = props
  const [outputsOpen, setOutputsOpen] = useState(true)
  const [rootOpen, setRootOpen] = useState(true)

  const [expanded, setExpanded] = useState<Set<string>>(new Set(["/"]))
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [creating, setCreating] = useState<Creating>(null)
  const [renaming, setRenaming] = useState<Renaming>(null)
  const [editValue, setEditValue] = useState("")
  // Selected folder = where the toolbar's "+ file/folder" buttons create. Like
  // VS Code: click a folder to make it the target. Defaults to root, but the
  // parent can hint a sensible default (e.g. folder of the active file).
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>(defaultTargetFolder || "/")

  // The project root row takes the first indent level.
  const base = projectName ? 1 : 0

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })

  const childMap = useMemo(() => {
    const map: Record<string, { folders: FolderNode[]; files: FileNode[] }> = {}
    const ensure = (p: string) => (map[p] ||= { folders: [], files: [] })
    ensure("/")
    folders.forEach((f) => { ensure(f.parentPath).folders.push(f); ensure(f.path) })
    files.forEach((f) => ensure(f.folderPath || "/").files.push(f))
    Object.values(map).forEach((g) => {
      g.folders.sort((a, b) => a.name.localeCompare(b.name))
      g.files.sort((a, b) => a.filename.localeCompare(b.filename))
    })
    return map
  }, [files, folders])

  // ── inline edit helpers ──
  const startCreate = (parent: string, kind: "file" | "folder") => {
    setRenaming(null)
    setRootOpen(true)
    setExpanded((prev) => new Set(prev).add(parent))
    setEditValue("")
    setCreating({ parent, kind })
  }
  const startRename = (id: string, kind: "file" | "folder", current: string) => {
    setCreating(null)
    setEditValue(current)
    setRenaming({ id, kind })
  }
  const cancelEdit = () => { setCreating(null); setRenaming(null); setEditValue("") }

  const commitCreate = () => {
    if (!creating) return
    const name = editValue.trim()
    if (name) (creating.kind === "file" ? onCreateFile : onCreateFolder)(creating.parent, name)
    cancelEdit()
  }
  const commitRename = () => {
    if (!renaming) return
    const name = editValue.trim()
    if (name) {
      if (renaming.kind === "file") { const f = files.find((x) => x.id === renaming.id); if (f && name !== f.filename) onRenameFile(f, name) }
      else { const f = folders.find((x) => x.id === renaming.id); if (f && name !== f.name) onRenameFolder(f, name) }
    }
    cancelEdit()
  }

  const startDrag = (e: React.DragEvent, item: DragItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(item))
    e.dataTransfer.effectAllowed = "move"
  }
  const handleDrop = (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(null)
    try {
      const item = JSON.parse(e.dataTransfer.getData("application/json")) as DragItem
      if (!item?.path) return
      if (item.kind === "folder" && normPath(targetFolderPath).startsWith(normPath(item.path))) return
      onMove(item, normPath(targetFolderPath))
    } catch { /* ignore */ }
  }

  const rowBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", margin: "1px 6px",
    borderRadius: 6, fontSize: 13, cursor: busy ? "default" : "pointer",
    userSelect: "none", whiteSpace: "nowrap", color: C.text,
  }
  const indent = (depth: number) => 8 + (base + depth) * 14

  // Inline editor row (used for both create and rename).
  const editRow = (depth: number, kind: "file" | "folder", commit: () => void) => (
    <div style={{ ...rowBase, paddingLeft: indent(depth) + (kind === "file" ? 15 : 0) }}>
      {kind === "folder"
        ? <Folder size={15} style={{ color: C.icon, flexShrink: 0 }} />
        : <FileIcon size={14} style={{ color: C.icon, flexShrink: 0 }} />}
      <input
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit() } else if (e.key === "Escape") { e.preventDefault(); cancelEdit() } }}
        onBlur={commit}
        placeholder={kind === "file" ? "filename.py" : "folder name"}
        className="flex-1 text-sm outline-none rounded px-1"
        style={{ border: "1px solid #0F9D94", fontFamily: "inherit", minWidth: 0 }}
      />
    </div>
  )

  const renderFolder = (folder: FolderNode, depth: number) => {
    const open = expanded.has(folder.path)
    const kids = childMap[folder.path] || { folders: [], files: [] }
    const isOver = dragOver === folder.path
    const isSelected = selectedFolderPath === folder.path
    const isRenaming = renaming?.kind === "folder" && renaming.id === folder.id
    return (
      <div key={folder.id}>
        {isRenaming ? editRow(depth, "folder", commitRename) : (
          <div
            className={`group ${C.hover}`}
            style={{
              ...rowBase,
              paddingLeft: indent(depth),
              background: isOver ? C.dropTarget : isSelected ? C.folderSelected : undefined,
            }}
            draggable={!busy}
            onDragStart={(e) => startDrag(e, { kind: "folder", path: folder.path })}
            onDragOver={(e) => { e.preventDefault(); setDragOver(folder.path) }}
            onDragLeave={() => setDragOver((p) => (p === folder.path ? null : p))}
            onDrop={(e) => handleDrop(e, folder.path)}
            // Single click: select the folder AND toggle expand/collapse, just
            // like VS Code. The toolbar's + buttons then target this folder.
            onClick={() => { setSelectedFolderPath(folder.path); toggle(folder.path) }}
          >
            {open ? <ChevronDown size={14} style={{ color: C.muted, flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: C.muted, flexShrink: 0 }} />}
            {open ? <FolderOpen size={15} style={{ color: C.icon, flexShrink: 0 }} /> : <Folder size={15} style={{ color: C.icon, flexShrink: 0 }} />}
            <span className="flex-1 truncate" style={{ color: C.navy }}>{folder.name}</span>
            <span className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
              <button title="New file" onClick={(e) => { e.stopPropagation(); startCreate(folder.path, "file") }}><FilePlus size={12} className="text-gray-500 hover:text-teal-700" /></button>
              <button title="New folder" onClick={(e) => { e.stopPropagation(); startCreate(folder.path, "folder") }}><FolderPlus size={12} className="text-gray-500 hover:text-teal-700" /></button>
              <button title="Rename" onClick={(e) => { e.stopPropagation(); startRename(folder.id, "folder", folder.name) }}><Pencil size={11} className="text-gray-500 hover:text-teal-700" /></button>
              <button title="Delete" onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder) }}><Trash2 size={11} className="text-gray-500 hover:text-red-600" /></button>
            </span>
          </div>
        )}
        {open && (
          <div>
            {creating?.parent === folder.path && editRow(depth + 1, creating.kind, commitCreate)}
            {kids.folders.map((f) => renderFolder(f, depth + 1))}
            {kids.files.map((f) => renderFile(f, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderFile = (file: FileNode, depth: number) => {
    const active = file.id === activeFileId
    const isRenaming = renaming?.kind === "file" && renaming.id === file.id
    if (isRenaming) return <div key={file.id}>{editRow(depth, "file", commitRename)}</div>
    return (
      <div
        key={file.id}
        className={`group ${active ? "" : C.hover}`}
        style={{
          ...rowBase,
          paddingLeft: indent(depth) + 15,
          background: active ? C.selected : undefined,
        }}
        draggable={!busy}
        onDragStart={(e) => startDrag(e, { kind: "file", path: file.path })}
        // Opening a file also selects its parent folder as the "+ target" so
        // the next + click creates a sibling, which matches user intuition.
        onClick={() => { onOpenFile(file.id); setSelectedFolderPath(file.folderPath || "/") }}
        title={file.path}
        aria-current={active ? "true" : undefined}
      >
        <FileGlyph file={file} />
        <span className="flex-1 truncate" style={{ color: C.navy, fontWeight: active ? 600 : 400 }}>{file.filename}</span>
        {file.isEntryPoint && <span className="text-2xs px-1 rounded bg-emerald-100 text-emerald-700 font-bold flex-shrink-0">RUN</span>}
        <span className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
          <button title="Rename" onClick={(e) => { e.stopPropagation(); startRename(file.id, "file", file.filename) }}><Pencil size={11} className="text-gray-500 hover:text-teal-700" /></button>
          <button title="Delete" onClick={(e) => { e.stopPropagation(); onDeleteFile(file) }}><Trash2 size={11} className="text-gray-500 hover:text-red-600" /></button>
        </span>
      </div>
    )
  }

  const root = childMap["/"] || { folders: [], files: [] }
  const rootOver = dragOver === "/"

  // Pretty target label for the header (e.g. "Explorer · /utils").
  const targetLabel = selectedFolderPath === "/" ? "" : ` · ${selectedFolderPath}`

  const headerBtn = "inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F2F1ED] disabled:opacity-40"

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: "8px 8px 6px 14px" }}>
        <span
          className="truncate"
          style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.text }}
          title={`New items will be created in: ${selectedFolderPath}`}
        >
          Explorer<span style={{ color: "#0F766E", textTransform: "none", letterSpacing: 0, fontFamily: "ui-monospace, monospace", fontWeight: 500 }}>{targetLabel}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            title={`New file in ${selectedFolderPath}`}
            aria-label="New file"
            disabled={busy}
            onClick={() => startCreate(selectedFolderPath, "file")}
            className={headerBtn}
          ><FilePlus size={16} style={{ color: C.icon }} /></button>
          <button
            title={`New folder in ${selectedFolderPath}`}
            aria-label="New folder"
            disabled={busy}
            onClick={() => startCreate(selectedFolderPath, "folder")}
            className={headerBtn}
          ><FolderPlus size={16} style={{ color: C.icon }} /></button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto pb-1"
        style={{ background: rootOver ? C.dropTarget : undefined }}
        onDragOver={(e) => { e.preventDefault(); setDragOver("/") }}
        onDragLeave={() => setDragOver((p) => (p === "/" ? null : p))}
        onDrop={(e) => handleDrop(e, "/")}
        // Click on empty space resets the target to root, matching VS Code.
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedFolderPath("/") }}
      >
        {projectName && (
          <div
            className={C.hover}
            style={{ ...rowBase, paddingLeft: 8, fontWeight: 600, fontSize: 12.5, letterSpacing: "0.02em", color: C.navy }}
            onClick={() => { setSelectedFolderPath("/"); setRootOpen((v) => !v) }}
            title={projectName}
          >
            {rootOpen ? <ChevronDown size={14} style={{ color: C.muted, flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: C.muted, flexShrink: 0 }} />}
            <span className="truncate" style={{ textTransform: "uppercase" }}>{projectName}</span>
          </div>
        )}
        {(rootOpen || !projectName) && (
          <>
            {creating?.parent === "/" && editRow(0, creating.kind, commitCreate)}
            {root.folders.length === 0 && root.files.length === 0 && !creating ? (
              <div className="px-3 py-6 text-center text-2xs text-gray-400">No files yet. Use the + buttons above.</div>
            ) : (
              <>
                {root.folders.map((f) => renderFolder(f, 0))}
                {root.files.map((f) => renderFile(f, 0))}
              </>
            )}
          </>
        )}
      </div>

      {outputFiles.length > 0 && (
        <div className="flex-shrink-0 border-t overflow-auto" style={{ borderColor: C.border, maxHeight: "45%" }}>
          <button
            onClick={() => setOutputsOpen((v) => !v)}
            className={`w-full flex items-center gap-1 px-2 py-1.5 text-left ${C.hover}`}
            title="Files your program created when you clicked Run. Saved on the server and deleted every day at midnight. They are not part of Run Testcase or Submit — add a file to the project if your program needs it there."
          >
            {outputsOpen ? <ChevronDown size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />}
            <span className="flex-1 text-2xs font-semibold uppercase tracking-wide text-gray-500 truncate">Output files</span>
            <span className="text-2xs text-gray-400 flex-shrink-0">{outputFiles.length}</span>
          </button>
          {outputsOpen && (
            <div className="pb-1">
              <div className="px-3 pb-1 text-2xs text-gray-400">Read-only · deleted daily · not used by Run Testcase or Submit</div>
              {outputFiles.map((file) => {
                const active = file.id === activeFileId
                const rel = file.path.replace(/^\/+/, "")
                return (
                  <div
                    key={file.id}
                    className={active ? "" : C.hover}
                    style={{ ...rowBase, cursor: "pointer", paddingLeft: 23, background: active ? C.selected : undefined }}
                    onClick={() => onOpenFile(file.id)}
                    title={`${rel} (created by your program)`}
                  >
                    <FileGlyph file={file} />
                    <span className="flex-1 truncate" style={{ color: C.navy, fontWeight: active ? 600 : 400 }}>{rel}</span>
                    <span className="text-2xs px-1 rounded bg-sky-100 text-sky-700 font-bold flex-shrink-0">OUTPUT</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export type { DragItem }
export { joinPath }
