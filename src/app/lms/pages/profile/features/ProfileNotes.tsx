"use client"

// Notes on the Profile page — the same notes the course viewer's Notes panel
// keeps (GET/POST/PUT/DELETE /…/notes), read through the same service and the
// same ['notes', token] query, so a note made in a course shows up here and
// one edited here shows up there without a reload.

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold, Eye, FileText, Italic, List, ListOrdered, MoreVertical, Pencil, Pin, PinOff,
  Plus, Search, Trash2, Underline as UnderlineIcon, X,
} from "lucide-react"
import { toast } from "sonner"
import { getToken } from "@/lib/session"
import { cn } from "@/lib/utils"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  createNote, deleteNote, fetchNotes, togglePinNote, updateNote, type Note,
} from "@/app/lms/pages/courses/coursesdetailedview/api/notesPanelService"
import {
  ACCENT_TEXT, Chip, DialogFrame, DiscardDialog, EmptyState, Field, PButton, Panel, Skeleton,
  fmtDateTime, inputCls, relTime, stripHtml,
} from "./profileUi"

const noteTime = (n: Note) => n.lastEdited || n.updatedAt || n.createdAt
const byRecent = (a: Note, b: Note) => new Date(noteTime(b)).getTime() - new Date(noteTime(a)).getTime()
const RESOURCE_LABEL: Record<string, string> = { pdf: "PDF", ppt: "Slides", video: "Video" }

// Rich text inside notes: Tailwind's reset strips list markers, so they come
// back here, scoped to the note surfaces.
const NOTE_PROSE =
  "[&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold " +
  "[&_a]:text-[#5b47e0] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-hairline-strong [&_blockquote]:pl-3 " +
  "[&_code]:rounded [&_code]:bg-surface-sunken [&_code]:px-1"

// ── Data ─────────────────────────────────────────────────────────────────────
export function useProfileNotes() {
  const token = getToken()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ["notes", token],
    queryFn: () => fetchNotes(token as string, true),
    enabled: !!token,
    staleTime: 60 * 1000,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ["notes"] })

  const save = useMutation({
    mutationFn: async (input: { id?: string; title: string; content: string }) =>
      input.id
        ? updateNote(input.id, { title: input.title, content: input.content }, token as string)
        : createNote({ title: input.title, content: input.content, tags: [] }, token as string),
    onSuccess: (_d, v) => { toast.success(v.id ? "Note updated" : "Note added", { position: "top-right" }); refresh() },
    onError: (e: any) => toast.error(e?.message || "Could not save the note.", { position: "top-right" }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteNote(id, token as string),
    onSuccess: () => { toast.success("Note deleted", { position: "top-right" }); refresh() },
    onError: (e: any) => toast.error(e?.message || "Could not delete the note.", { position: "top-right" }),
  })
  const pin = useMutation({
    mutationFn: (n: Note) => togglePinNote(n._id, token as string),
    onSuccess: (_d, n) => { toast.success(n.isPinned ? "Note unpinned" : "Note pinned", { position: "top-right" }); refresh() },
    onError: (e: any) => toast.error(e?.message || "Could not change the pin.", { position: "top-right" }),
  })

  const notes = useMemo(() => (query.data || []).slice().sort(byRecent), [query.data])
  return { notes, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch, save, remove, pin }
}

export type NotesApi = ReturnType<typeof useProfileNotes>

/** Which note dialog is open: the editor (new or existing), the reader, or
 *  the delete confirmation. Owned by the page so the Overview card and the
 *  Notes tab open the same dialogs. */
export type NoteDialogState =
  | { kind: "edit"; note: Note | null }
  | { kind: "view"; note: Note }
  | { kind: "delete"; note: Note }
  | null

// ── Card ─────────────────────────────────────────────────────────────────────
function NoteCard({ note, onOpen, api, compact }: {
  note: Note; onOpen: (s: NoteDialogState) => void; api: NotesApi; compact?: boolean
}) {
  const preview = stripHtml(note.content)
  return (
    <article
      className="group relative flex min-w-0 flex-col rounded-xl border border-hairline bg-surface p-4 transition-colors hover:border-[#d9d2fb] hover:bg-[#fbfaff] dark:hover:border-[#7a6af0]/40 dark:hover:bg-white/[0.02]"
    >
      <button
        type="button"
        onClick={() => onOpen({ kind: "view", note })}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47e0]/30"
        aria-label={`Open note ${note.title || "Untitled note"}`}
      />
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-heading">
          {note.isPinned && <Pin className={cn("h-3.5 w-3.5 flex-shrink-0", ACCENT_TEXT)} aria-label="Pinned" />}
          <span className="truncate">{note.title || "Untitled note"}</span>
        </h3>
        <div className="relative z-10 flex flex-shrink-0 items-center gap-1">
          <time className="text-xs text-subtle" title={fmtDateTime(noteTime(note))}>{relTime(noteTime(note))}</time>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Note actions"
                className="grid h-7 w-7 place-items-center rounded-md text-subtle transition-colors hover:bg-row-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47e0]/30"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onOpen({ kind: "view", note })}><Eye className="h-4 w-4" /> View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpen({ kind: "edit", note })}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => api.pin.mutate(note)} disabled={api.pin.isPending}>
                {note.isPinned ? <><PinOff className="h-4 w-4" /> Unpin</> : <><Pin className="h-4 w-4" /> Pin</>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpen({ kind: "delete", note })} className="text-red-600 focus:text-red-700 dark:text-red-400">
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <p className={cn("mt-1.5 break-words text-[13px] leading-relaxed text-body", compact ? "line-clamp-1" : "line-clamp-3")}>
        {preview || <span className="text-subtle">No content</span>}
      </p>
      {(note.resourceType || (!compact && note.tags?.length > 0)) && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {note.resourceType && <Chip tone="accent">From a {RESOURCE_LABEL[note.resourceType] || "resource"}</Chip>}
          {!compact && note.tags?.slice(0, 3).map((t) => <Chip key={t}>#{t}</Chip>)}
        </div>
      )}
    </article>
  )
}

function NotesSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-hairline p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2.5 h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

// ── Overview card ────────────────────────────────────────────────────────────
export function RecentNotesCard({ api, onOpen, onViewAll }: {
  api: NotesApi; onOpen: (s: NoteDialogState) => void; onViewAll: () => void
}) {
  const pinned = api.notes.filter((n) => n.isPinned).length
  return (
    <Panel
      icon={FileText}
      title="Recent notes"
      subtitle={api.isLoading ? "Loading…" : `${api.notes.length} ${api.notes.length === 1 ? "note" : "notes"} · ${pinned} pinned`}
      action={
        <PButton size="sm" variant="primary" onClick={() => onOpen({ kind: "edit", note: null })}>
          <Plus className="h-3.5 w-3.5" /> Add note
        </PButton>
      }
    >
      {api.isLoading ? (
        <NotesSkeleton />
      ) : api.notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          text="Jot down what you learn — notes you take in a course appear here too."
          action={<PButton size="sm" variant="soft" onClick={() => onOpen({ kind: "edit", note: null })}><Plus className="h-3.5 w-3.5" /> Add your first note</PButton>}
        />
      ) : (
        <div className="space-y-3">
          {api.notes.slice(0, 3).map((n) => <NoteCard key={n._id} note={n} onOpen={onOpen} api={api} compact />)}
          {api.notes.length > 3 && (
            <button type="button" onClick={onViewAll} className={cn("text-[13px] font-medium hover:underline", ACCENT_TEXT)}>
              View all {api.notes.length} notes
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}

// ── Notes tab ────────────────────────────────────────────────────────────────
export function NotesTab({ api, onOpen }: { api: NotesApi; onOpen: (s: NoteDialogState) => void }) {
  const [search, setSearch] = useState("")
  const [show, setShow] = useState<"all" | "pinned">("all")
  const pinnedCount = api.notes.filter((n) => n.isPinned).length

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return api.notes
      .filter((n) => show === "all" || n.isPinned)
      .filter((n) => !q || `${n.title} ${stripHtml(n.content)} ${(n.tags || []).join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned) || byRecent(a, b))
  }, [api.notes, search, show])

  return (
    <Panel
      icon={FileText}
      title="Notes"
      subtitle={api.isLoading ? "Loading…" : `${api.notes.length} ${api.notes.length === 1 ? "note" : "notes"} · ${pinnedCount} pinned`}
      action={
        <PButton size="sm" variant="primary" onClick={() => onOpen({ kind: "edit", note: null })}>
          <Plus className="h-3.5 w-3.5" /> Add note
        </PButton>
      }
    >
      {api.notes.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes"
              aria-label="Search notes"
              className={cn(inputCls(), "pl-9")}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-subtle hover:text-heading">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div role="tablist" aria-label="Show notes" className="inline-flex rounded-[9px] border border-hairline bg-surface-sunken p-0.5">
            {(["all", "pinned"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={show === k}
                onClick={() => setShow(k)}
                className={cn(
                  "h-8 rounded-[7px] px-3 text-[13px] font-medium transition-colors",
                  show === k ? "bg-surface text-heading shadow-xs" : "text-subtle hover:text-heading",
                )}
              >
                {k === "all" ? `All (${api.notes.length})` : `Pinned (${pinnedCount})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {api.isLoading ? (
        <NotesSkeleton count={4} />
      ) : api.isError ? (
        <EmptyState icon={FileText} title="Couldn't load your notes" text="Check your connection and try again." action={<PButton size="sm" variant="outline" onClick={() => api.refetch()}>Try again</PButton>} />
      ) : api.notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          text="Notes you take here or while studying a course appear in one place."
          action={<PButton size="sm" variant="primary" onClick={() => onOpen({ kind: "edit", note: null })}><Plus className="h-3.5 w-3.5" /> Add your first note</PButton>}
        />
      ) : list.length === 0 ? (
        <EmptyState icon={Search} title="No matching notes" text={show === "pinned" && !search ? "You haven't pinned any notes yet." : "Try a different word."} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((n) => <NoteCard key={n._id} note={n} onOpen={onOpen} api={api} />)}
        </div>
      )}
    </Panel>
  )
}

// ── Dialogs ──────────────────────────────────────────────────────────────────
function ToolbarBtn({ editor, label, active, onClick, children }: {
  editor: Editor | null; label: string; active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={!editor}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md transition-colors",
        active ? "bg-[#ece8fe] text-[#4a37c9] dark:bg-[#7a6af0]/20 dark:text-[#c9c1fb]" : "text-subtle hover:bg-row-hover hover:text-heading",
      )}
    >
      {children}
    </button>
  )
}

function NoteEditorDialog({ state, onClose, api }: {
  state: { kind: "edit"; note: Note | null }; onClose: () => void; api: NotesApi
}) {
  const note = state.note
  const [title, setTitle] = useState(note?.title || "")
  const [html, setHtml] = useState(note?.content || "")
  const [touched, setTouched] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Write your note…" }),
    ],
    content: note?.content || "",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => setHtml(ed.isEmpty ? "" : ed.getHTML()),
    editorProps: {
      attributes: { class: cn("min-h-[200px] px-3.5 py-3 text-sm leading-relaxed text-heading focus:outline-none", NOTE_PROSE) },
    },
  })
  const titleError = touched && !title.trim() ? "Give the note a title." : title.length > 200 ? "Keep the title under 200 characters." : ""
  const dirty = title !== (note?.title || "") || html !== (note?.content || "")
  const saving = api.save.isPending

  const requestClose = () => {
    if (saving) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }
  const save = () => {
    setTouched(true)
    if (!title.trim() || title.length > 200) return
    api.save.mutate({ id: note?._id, title: title.trim(), content: html }, { onSuccess: onClose })
  }

  return (
    <>
      <DialogFrame
        open
        onRequestClose={requestClose}
        title={note ? "Edit note" : "New note"}
        width="sm:max-w-[640px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <PButton size="sm" variant="outline" onClick={requestClose} disabled={saving}>Cancel</PButton>
            <PButton size="sm" variant="primary" onClick={save} loading={saving} disabled={!!note && !dirty}>
              {note ? "Save changes" : "Add note"}
            </PButton>
          </div>
        }
      >
        <div className="space-y-4">
          <Field id="note-title" label="Title" error={titleError}>
            <input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Greedy algorithms — key ideas"
              maxLength={220}
              className={inputCls(titleError)}
              autoFocus
            />
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-body">Note</p>
            <div className="overflow-hidden rounded-[9px] border border-field focus-within:border-[#5b47e0] focus-within:ring-2 focus-within:ring-[#5b47e0]/15">
              <div className="flex items-center gap-0.5 border-b border-hairline bg-surface-sunken/60 px-1.5 py-1">
                <ToolbarBtn editor={editor} label="Bold" active={!!editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></ToolbarBtn>
                <ToolbarBtn editor={editor} label="Italic" active={!!editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></ToolbarBtn>
                <ToolbarBtn editor={editor} label="Underline" active={!!editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-3.5 w-3.5" /></ToolbarBtn>
                <span className="mx-1 h-4 w-px bg-hairline" aria-hidden="true" />
                <ToolbarBtn editor={editor} label="Bulleted list" active={!!editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></ToolbarBtn>
                <ToolbarBtn editor={editor} label="Numbered list" active={!!editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></ToolbarBtn>
              </div>
              <EditorContent editor={editor} className="max-h-[42dvh] overflow-y-auto bg-surface" />
            </div>
          </div>
        </div>
        {/* Tiptap's placeholder is a data attribute; this paints it. */}
        <style>{`.tiptap p.is-editor-empty:first-child::before{content:attr(data-placeholder);float:left;height:0;pointer-events:none;color:#9ca3af}`}</style>
      </DialogFrame>
      <DiscardDialog
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose() }}
        text="Your changes to this note have not been saved."
      />
    </>
  )
}

function NoteViewDialog({ note, onClose, onOpen, api }: {
  note: Note; onClose: () => void; onOpen: (s: NoteDialogState) => void; api: NotesApi
}) {
  return (
    <DialogFrame
      open
      onRequestClose={onClose}
      title={note.title || "Untitled note"}
      description={`Last edited ${fmtDateTime(noteTime(note))}${note.resourceType ? ` · from a ${RESOURCE_LABEL[note.resourceType] || "resource"}` : ""}`}
      width="sm:max-w-[640px]"
      footer={
        <div className="flex w-full flex-wrap justify-between gap-2">
          <PButton size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => onOpen({ kind: "delete", note })}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </PButton>
          <div className="flex gap-2">
            <PButton size="sm" variant="outline" onClick={() => api.pin.mutate(note, { onSuccess: onClose })} loading={api.pin.isPending}>
              {note.isPinned ? <><PinOff className="h-3.5 w-3.5" /> Unpin</> : <><Pin className="h-3.5 w-3.5" /> Pin</>}
            </PButton>
            <PButton size="sm" variant="primary" onClick={() => onOpen({ kind: "edit", note })}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </PButton>
          </div>
        </div>
      }
    >
      {stripHtml(note.content) ? (
        <div className={cn("break-words text-sm leading-relaxed text-heading", NOTE_PROSE)} dangerouslySetInnerHTML={{ __html: note.content }} />
      ) : (
        <p className="text-sm text-subtle">This note has no content yet.</p>
      )}
    </DialogFrame>
  )
}

function DeleteNoteDialog({ note, onClose, api }: { note: Note; onClose: () => void; api: NotesApi }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !api.remove.isPending) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete this note?</DialogTitle>
          <DialogDescription>
            “{note.title || "Untitled note"}” will be deleted permanently. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <PButton size="sm" variant="outline" onClick={onClose} disabled={api.remove.isPending}>Cancel</PButton>
          <PButton size="sm" variant="danger" loading={api.remove.isPending} onClick={() => api.remove.mutate(note._id, { onSuccess: onClose })}>
            Delete note
          </PButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Renders whichever note dialog is open. */
export function NoteDialogs({ state, setState, api }: {
  state: NoteDialogState; setState: (s: NoteDialogState) => void; api: NotesApi
}) {
  if (!state) return null
  const close = () => setState(null)
  if (state.kind === "edit") return <NoteEditorDialog key={state.note?._id || "new"} state={state} onClose={close} api={api} />
  if (state.kind === "view") return <NoteViewDialog note={state.note} onClose={close} onOpen={setState} api={api} />
  return <DeleteNoteDialog note={state.note} onClose={close} api={api} />
}
