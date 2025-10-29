"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, X, Save, Trash2, Download, Copy, Check, Plus, Edit2, Maximize2, Minimize2, Search, Clock } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import PrimeReact Editor to avoid SSR issues
const Editor = dynamic(() => import("primereact/editor").then(mod => mod.Editor), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-muted-foreground">Loading editor...</div>
});

// Import Quill CSS
import 'react-quill/dist/quill.snow.css';

interface Note {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

interface NotesPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotesPanel({ isOpen, onClose }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load saved notes
    const saved = sessionStorage.getItem("lms-notes-list")
    if (saved) {
      const parsed = JSON.parse(saved)
      const notesWithDates = parsed.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt)
      }))
      setNotes(notesWithDates)
    }

    // Load saved position
    setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 570 })
  }, [])

  useEffect(() => {
    // Save notes
    if (notes.length > 0) {
      sessionStorage.setItem("lms-notes-list", JSON.stringify(notes))
    }
  }, [notes])

  // Update position when expanded state changes to ensure it stays within bounds
  useEffect(() => {
    if (!isOpen) return;

    const panelWidth = isExpanded ? 800 : 400;
    const panelHeight = isExpanded ? 650 : 550;

    // Ensure panel stays within viewport
    const maxX = window.innerWidth - panelWidth;
    const maxY = window.innerHeight - panelHeight;

    setPosition(prev => ({
      x: Math.max(0, Math.min(prev.x, maxX)),
      y: Math.max(0, Math.min(prev.y, maxY))
    }));
  }, [isExpanded, isOpen]);

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // Calculate current panel dimensions
      const panelWidth = isExpanded ? 800 : 400
      const panelHeight = isExpanded ? 650 : 550

      // Keep panel within viewport bounds with current dimensions
      const maxX = window.innerWidth - panelWidth
      const maxY = window.innerHeight - panelHeight

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset, isExpanded])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    }
    setNotes([newNote, ...notes])
    setCurrentNote(newNote)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
    setIsEditing(true)
  }

  const saveCurrentNote = () => {
    if (!currentNote) return

    setIsSaving(true)
    const updatedNotes = notes.map(n =>
      n.id === currentNote.id
        ? { ...n, title: editTitle || "Untitled Note", content: editContent, updatedAt: new Date() }
        : n
    )
    setNotes(updatedNotes)
    setCurrentNote({ ...currentNote, title: editTitle || "Untitled Note", content: editContent, updatedAt: new Date() })
    setIsEditing(false)

    setTimeout(() => setIsSaving(false), 500)
  }

  const deleteNote = (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return

    const filtered = notes.filter(n => n.id !== noteId)
    setNotes(filtered)
    if (currentNote?.id === noteId) {
      setCurrentNote(null)
      setIsEditing(false)
    }
  }

  const selectNote = (note: Note) => {
    setCurrentNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setIsEditing(true)
  }

  const editNote = () => {
    if (!currentNote) return
    setEditTitle(currentNote.title)
    setEditContent(currentNote.content)
    setIsEditing(true)
  }

  const copyToClipboard = async () => {
    if (!currentNote) return
    try {
      await navigator.clipboard.writeText(currentNote.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const downloadNote = () => {
    if (!currentNote) return
    const blob = new Blob([currentNote.content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${currentNote.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleExpand = () => {
    const newExpandedState = !isExpanded;

    // Calculate new dimensions
    const newWidth = newExpandedState ? 800 : 400;
    const newHeight = newExpandedState ? 650 : 550;

    // Adjust position to stay within viewport
    const maxX = window.innerWidth - newWidth;
    const maxY = window.innerHeight - newHeight;

    setPosition(prev => ({
      x: Math.max(0, Math.min(prev.x, maxX)),
      y: Math.max(0, Math.min(prev.y, maxY))
    }));

    setIsExpanded(newExpandedState);
  }

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const getWordCount = (text: string) => {
    // Strip HTML tags for word count
    const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
    return cleanText.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Handle editor text change
  const handleEditorChange = (e: any) => {
    setEditContent(e.htmlValue || "");
  }

  if (!isOpen) return null

  const panelWidth = isExpanded ? 800 : 400
  const panelHeight = isExpanded ? 650 : 550

  return (
    <div
      ref={panelRef}
      className="fixed z-50"
      role="dialog"
      aria-label="Notes panel"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? "grabbing" : "default"
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(-12px);
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .notes-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .notes-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .notes-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 3px;
        }
        
        .notes-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground));
        }

        /* Custom styles for PrimeReact Editor */
        .p-editor-container {
          border: none !important;
          height: 100% !important;
        }
        
        .p-editor-toolbar {
          background: hsl(var(--muted)) !important;
          border: none !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          padding: 0.5rem !important;
        }
        
        .p-editor-content {
          border: none !important;
          height: calc(100% - 45px) !important;
          background: hsl(var(--card)) !important;
        }
        
        .ql-editor {
          background: hsl(var(--card)) !important;
          color: hsl(var(--foreground)) !important;
          font-size: 0.875rem !important;
          line-height: 1.6 !important;
        }
        
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        
        .ql-container.ql-snow {
          border: none !important;
        }
        
       /* Active toolbar button styles */
.ql-snow .ql-toolbar button.ql-active,
.ql-snow .ql-toolbar .ql-picker-label.ql-active,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected {
  background-color: hsl(var(--primary)) !important;
  color: white !important;
  border-radius: 4px !important;
}

.ql-snow .ql-toolbar button:hover,
.ql-snow .ql-toolbar .ql-picker-label:hover,
.ql-snow .ql-toolbar .ql-picker-item:hover {
  background-color: hsl(var(--muted)) !important;
  border-radius: 4px !important;
}

/* Specific styling for active picker items */
.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke {
  stroke: white !important;
}

.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-fill {
  fill: white !important;
}

.ql-snow .ql-toolbar button.ql-active .ql-stroke {
  stroke: white !important;
}

.ql-snow .ql-toolbar button.ql-active .ql-fill {
  fill: white !important;
}
      `}</style>

      <div
        className="flex shadow-xl rounded-lg overflow-hidden transition-all duration-300"
        style={{
          width: panelWidth,
          height: panelHeight,
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))"
        }}
      >
        {/* Sidebar - Notes List */}
        <div
          className="flex flex-col border-r"
          style={{
            width: isExpanded ? 300 : 160,
            borderColor: "hsl(var(--border))",
            backgroundColor: "hsl(var(--muted))"
          }}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                All Notes ({notes.length})
              </span>
              <button
                onClick={createNewNote}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                style={{ backgroundColor: "hsl(var(--primary))", color: "white" }}
                title="New note"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {isExpanded && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-8 pr-2 py-1.5 rounded text-xs"
                  style={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))"
                  }}
                />
              </div>
            )}
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto notes-scrollbar">
            {filteredNotes.length === 0 ? (
              <div className="p-4 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {notes.length === 0 ? "No notes yet" : "No results"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className="p-2 rounded-lg cursor-pointer transition-all hover:opacity-80"
                    style={{
                      backgroundColor: currentNote?.id === note.id ? "hsl(var(--primary))" : "hsl(var(--background))",
                      color: currentNote?.id === note.id ? "white" : "hsl(var(--foreground))",
                      border: "1px solid hsl(var(--border))"
                    }}
                  >
                    <h4 className="text-xs font-semibold mb-1 truncate">{note.title}</h4>
                    {isExpanded && (
                      <>
                        <p className="text-xs opacity-80 line-clamp-2 mb-1">
                          {note.content ? note.content.replace(/<[^>]*>/g, ' ').substring(0, 100) + '...' : "Empty note"}
                        </p>
                        <div className="flex items-center justify-between text-xs opacity-70">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(note.updatedAt)}
                          </span>
                          <span>{getWordCount(note.content)} words</span>
                        </div>
                      </>
                    )}
                    {!isExpanded && (
                      <p className="text-xs opacity-70">{formatDate(note.updatedAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            onMouseDown={handleMouseDown}
            style={{
              borderColor: "hsl(var(--border))",
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)",
              cursor: isDragging ? "grabbing" : "grab"
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
              >
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">
                  {currentNote ? (isEditing ? "Edit Note" : currentNote.title) : "My Notes"}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: isSaving ? "#fbbf24" : currentNote ? "#4ade80" : "#94a3b8",
                      animation: isSaving ? "pulse 1s infinite" : "none"
                    }}
                  />
                  <span className="text-xs text-white/80">
                    {isSaving ? "Saving..." : currentNote ? formatDate(currentNote.updatedAt) : "Select a note"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleExpand}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
                title={isExpanded ? "Minimize" : "Expand"}
                style={{ color: "white" }}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
                aria-label="Close notes"
                title="Close"
                style={{ color: "white" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          {currentNote && (
            <div
              className="flex items-center justify-between p-3 border-b"
              style={{
                borderColor: "hsl(var(--border))",
                backgroundColor: "hsl(var(--muted))"
              }}
            >
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={editNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: "hsl(var(--primary))",
                      color: "white"
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={saveCurrentNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: "hsl(var(--primary))",
                      color: "white"
                    }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                )}
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                    border: "1px solid hsl(var(--border))"
                  }}
                  disabled={!currentNote.content.trim()}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadNote}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                    border: "1px solid hsl(var(--border))"
                  }}
                  title="Download"
                  disabled={!currentNote.content.trim()}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteNote(currentNote.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-100"
                  style={{
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--destructive))",
                    border: "1px solid hsl(var(--border))"
                  }}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "hsl(var(--background))" }}>
            {!currentNote ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: "hsl(var(--muted))" }}
                >
                  <FileText className="w-10 h-10" style={{ color: "hsl(var(--muted-foreground))" }} />
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--foreground))" }}>
                  No Note Selected
                </h3>
                <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Select a note from the sidebar or create a new one
                </p>
                <button
                  onClick={createNewNote}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                  style={{
                    backgroundColor: "hsl(var(--primary))",
                    color: "white"
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Create New Note
                </button>
              </div>
            ) : isEditing ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Note title..."
                    className="w-full px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--foreground))"
                    }}
                  />
                </div>
                <div className="flex-1">
                  <Editor
                    value={editContent}
                    onTextChange={handleEditorChange}
                    style={{ height: '100%' }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 h-full">
                <div
                  className="p-4 rounded-lg h-full overflow-y-auto"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))"
                  }}
                >
                  {currentNote.content ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentNote.content }}
                    />
                  ) : (
                    <p style={{ color: "hsl(var(--muted-foreground))" }}>This note is empty. Click Edit to add content.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {currentNote && (
            <div
              className="flex items-center justify-between px-4 py-3 border-t text-xs"
              style={{
                borderColor: "hsl(var(--border))",
                backgroundColor: "hsl(var(--muted))",
                color: "hsl(var(--muted-foreground))"
              }}
            >
              <div className="flex items-center gap-4">
                <span>
                  <span className="font-medium">
                    {getWordCount(isEditing ? editContent : currentNote.content)}
                  </span> words
                </span>
                <span>
                  <span className="font-medium">
                    {(isEditing ? editContent : currentNote.content).replace(/<[^>]*>/g, '').length}
                  </span> characters
                </span>
              </div>
              <span>Created {formatDate(currentNote.createdAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



