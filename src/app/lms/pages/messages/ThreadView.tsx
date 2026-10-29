"use client";

// One conversation, in the Teams manner: Chat, Shared (files and links) and
// Notes tabs; People and a search in the header; messages with replies,
// reactions, edit and delete; a composer with files, emoji and @mentions.
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Check, CheckCheck, Code2, Copy, CornerUpLeft, Link2, Loader2, Lock, Megaphone, Paperclip, Pencil, Search,
    Send, Smile, Trash2, Upload, Users, X,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-toastify";
import { getUserId } from "@/lib/session";
import {
    MAX_FILE_BYTES, REACTIONS, chatError, chatKeys, deleteChatMessage, editChatMessage, fetchChatMembers, fetchChatMessages,
    fetchChatNotes, fetchChatShared, markChatRead, openChat, reactChatMessage, saveChatNotes, searchChatMessages,
    sendChatMessage, uploadChatFile,
    type ChatAttachment, type ChatMember, type ChatMessage, type ChatPage, type ChatThread,
} from "./api/peopleChat";
import { appendToThread, replaceInThread, useChatLive } from "./useChatLive";
import {
    Attachments, Avatar, FileGlyph, MessageBody, PersonAvatar, clock, dayLabel, dayStart, fileSize, shortDate,
} from "./chatUi";

const MAX_TEXT = 4000;
const MAX_FILES = 10;
type Tab = "chat" | "shared" | "notes";

// The composer's picker; reactions are the server's fixed set.
const EMOJIS = [
    "😀", "😃", "😄", "😁", "😅", "😂", "🙂", "😉", "😊", "😍", "🤩", "😎", "🤔", "😐", "😴", "😮",
    "😢", "😭", "😡", "🙏", "👍", "👎", "👏", "🙌", "💪", "👌", "✌️", "🤝", "👋", "❤️", "🔥", "⭐",
    "🎉", "✅", "❌", "⚠️", "💡", "📌", "📎", "📝", "📚", "💻", "🐞", "🚀", "⏰", "❓", "💯", "🙋",
];

function IconButton({
    label, onClick, children, active = false, disabled = false, className = "",
}: {
    label: string;
    onClick?: () => void;
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            disabled={disabled}
            aria-pressed={active || undefined}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-body transition-colors hover:bg-row-hover disabled:opacity-40 ${
                active ? "bg-row-hover text-heading" : ""
            } ${className}`}
        >
            {children}
        </button>
    );
}

const replyPreview = (m: Pick<ChatMessage, "text" | "attachments">) =>
    m.text.replace(/```/g, "").replace(/\s+/g, " ").trim().slice(0, 140) || (m.attachments?.length ? `📎 ${m.attachments[0].name}` : "");

// ─── People ──────────────────────────────────────────────────────────────────
function PeopleMenu({ members, fallbackCount }: { members: ChatMember[]; fallbackCount: number }) {
    const count = members.length || fallbackCount;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    title="People"
                    aria-label={`People (${count})`}
                    className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-body hover:bg-row-hover"
                >
                    <Users size={18} />
                    {count || ""}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[290px] p-0">
                <div className="px-3.5 pb-1 pt-3 text-[12.5px] font-semibold text-subtle">People ({count})</div>
                <div className="max-h-[360px] overflow-y-auto px-1.5 pb-2">
                    {!members.length && <div className="px-2 py-4 text-center text-[12.5px] text-subtle">Loading…</div>}
                    {members.map((p) => (
                        <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                            <PersonAvatar seed={p.id} name={p.name} online={p.online} size={30} />
                            <span className="min-w-0 flex-1 truncate text-[13.5px] text-heading">{p.name}</span>
                            {p.me ? (
                                <span className="text-[11px] text-faint">You</span>
                            ) : p.role === "trainer" ? (
                                <span className="rounded bg-brand-50 px-1.5 text-[10.5px] font-semibold text-brand-700">Trainer</span>
                            ) : null}
                        </div>
                    ))}
                </div>
                <div className="border-t border-ink-200 px-3.5 py-2 text-[11.5px] leading-snug text-faint">
                    The batch roster decides who is here.
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── One message ─────────────────────────────────────────────────────────────
function MessageItem({
    m, kind, showSender, seen, canModerate, nameOf, me, flash, onReply, onJump,
}: {
    m: ChatMessage;
    kind: "direct" | "group";
    showSender: boolean;
    seen: "seen" | "sent" | null;
    canModerate: boolean;
    nameOf: (id: string) => string;
    me: string;
    flash: boolean;
    onReply: (m: ChatMessage) => void;
    onJump: (id: string) => void;
}) {
    const queryClient = useQueryClient();
    const [tools, setTools] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(m.text);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);

    const apply = (msg: ChatMessage) =>
        queryClient.setQueryData<ChatPage>(chatKeys.messages(m.conversationId), (p) =>
            replaceInThread(p, { ...msg, mine: msg.senderId === me }));
    const run = async (fn: () => Promise<ChatMessage>) => {
        setBusy(true);
        try {
            apply(await fn());
            return true;
        } catch (e) {
            toast.error(chatError(e).message);
            return false;
        } finally {
            setBusy(false);
        }
    };
    const react = (emoji: string) => {
        setTools(false);
        run(() => reactChatMessage(m.id, emoji));
    };
    const saveEdit = async () => {
        const text = draft.replace(/\s+$/, "");
        if (text === m.text) return setEditing(false);
        if (!text.trim() && !m.attachments?.length) return;
        if (await run(() => editChatMessage(m.id, text))) setEditing(false);
    };
    const remove = async () => {
        if (await run(() => deleteChatMessage(m.id))) {
            setConfirmDelete(false);
            queryClient.invalidateQueries({ queryKey: chatKeys.shared(m.conversationId) });
        }
    };
    const copy = () => {
        setTools(false);
        navigator.clipboard?.writeText(m.text).then(() => toast.success("Copied"), () => toast.error("Could not copy"));
    };

    const mentionedMe = !m.mine && (m.mentions || []).some((x) => x.id === me);
    const canEdit = m.mine && !m.deleted;
    const canDelete = !m.deleted && (m.mine || canModerate);

    return (
        <div
            id={`chatmsg-${m.id}`}
            className={`flex max-w-[82%] flex-col gap-1 sm:max-w-[72%] ${m.mine ? "items-end self-end" : "items-start self-start"}`}
        >
            {showSender && (
                <span className="flex items-center gap-1.5 px-1 text-[11.5px] font-semibold text-body">
                    {m.senderName}
                    {m.fromTrainer && <span className="rounded bg-brand-50 px-1 text-[10px] font-semibold text-brand-700">Trainer</span>}
                </span>
            )}

            {editing ? (
                <div className="flex w-[min(520px,80vw)] flex-col gap-1.5 rounded-xl border border-brand-300 bg-white p-2">
                    <textarea
                        autoFocus
                        data-esc-local="true"
                        value={draft}
                        maxLength={MAX_TEXT}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setEditing(false);
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                saveEdit();
                            }
                        }}
                        rows={Math.min(8, Math.max(2, draft.split("\n").length))}
                        className="w-full resize-none rounded-lg px-2 py-1.5 text-[13.5px] text-heading outline-none"
                    />
                    <span className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => setEditing(false)} className="h-8 rounded-lg px-3 text-[12.5px] font-semibold text-body hover:bg-row-hover">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={saveEdit}
                            disabled={busy}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[12.5px] font-semibold text-white disabled:opacity-60"
                        >
                            {busy && <Loader2 size={12} className="animate-spin" />}
                            Save
                        </button>
                    </span>
                </div>
            ) : (
                <div className="group relative flex max-w-full flex-col gap-1.5" onMouseLeave={() => setTools(false)}>
                    {/* Hover (or tap) tools: quick reactions, reply, copy, edit, delete. */}
                    {!m.deleted && (
                        <div
                            className={`absolute -top-8 z-10 items-center gap-0.5 rounded-lg border border-ink-200 bg-white p-0.5 shadow-md ${
                                tools ? "flex" : "hidden group-hover:flex group-focus-within:flex"
                            } ${m.mine ? "right-0" : "left-0"}`}
                        >
                            {REACTIONS.slice(0, 5).map((e) => (
                                <button
                                    key={e}
                                    type="button"
                                    title={`React ${e}`}
                                    onClick={() => react(e)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-[15px] hover:bg-row-hover"
                                >
                                    {e}
                                </button>
                            ))}
                            <span className="mx-0.5 h-5 w-px bg-ink-200" />
                            <IconButton label="Reply" onClick={() => { setTools(false); onReply(m); }} className="!h-7 !w-7">
                                <CornerUpLeft size={15} />
                            </IconButton>
                            {m.text && (
                                <IconButton label="Copy text" onClick={copy} className="!h-7 !w-7">
                                    <Copy size={14} />
                                </IconButton>
                            )}
                            {canEdit && (
                                <IconButton label="Edit" onClick={() => { setDraft(m.text); setEditing(true); setTools(false); }} className="!h-7 !w-7">
                                    <Pencil size={14} />
                                </IconButton>
                            )}
                            {canDelete && (
                                <IconButton label="Delete" onClick={() => { setConfirmDelete(true); setTools(false); }} className="!h-7 !w-7 text-danger-700">
                                    <Trash2 size={14} />
                                </IconButton>
                            )}
                        </div>
                    )}

                    {(m.deleted || m.text || m.replyTo) && (
                        <div
                            onClick={() => !m.deleted && setTools((v) => !v)}
                            className={`max-w-full px-3.5 py-2 text-[13.5px] leading-relaxed transition-shadow ${
                                m.deleted
                                    ? "rounded-[14px] border border-dashed border-ink-300 bg-transparent italic text-subtle"
                                    : m.mine
                                        ? "rounded-[14px_14px_4px_14px] bg-brand-600 text-white"
                                        : "rounded-[14px_14px_14px_4px] border border-ink-200 bg-white"
                            } ${mentionedMe ? "ring-2 ring-amber-300" : ""} ${flash ? "ring-2 ring-info-500" : ""}`}
                        >
                            {m.deleted ? (
                                "This message was deleted"
                            ) : (
                                <>
                                    {m.replyTo && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onJump(m.replyTo!.id);
                                            }}
                                            className={`mb-1.5 block w-full rounded-md border-l-[3px] px-2 py-1 text-left text-[12px] leading-snug ${
                                                m.mine ? "border-white/70 bg-white/15 text-white/90" : "border-brand-400 bg-[#F3F4F6] text-body"
                                            }`}
                                        >
                                            <span className="block font-semibold">{m.replyTo.senderName}</span>
                                            <span className="line-clamp-2">{m.replyTo.text || "Message"}</span>
                                        </button>
                                    )}
                                    {m.text && <MessageBody text={m.text} mine={m.mine} mentions={m.mentions} />}
                                </>
                            )}
                        </div>
                    )}

                    {!m.deleted && <Attachments files={m.attachments || []} mine={m.mine} />}
                </div>
            )}

            {confirmDelete && (
                <div className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-2.5 py-1.5 text-[12.5px] text-danger-700">
                    {m.mine ? "Delete this message?" : `Delete ${m.senderName}'s message?`}
                    <button type="button" onClick={remove} disabled={busy} className="font-semibold underline disabled:opacity-60">
                        Delete
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="text-body">
                        Cancel
                    </button>
                </div>
            )}

            {!!m.reactions?.length && (
                <div className={`flex flex-wrap gap-1 px-1 ${m.mine ? "justify-end" : ""}`}>
                    {m.reactions.map((r) => {
                        const mineR = r.userIds.includes(me);
                        return (
                            <button
                                key={r.emoji}
                                type="button"
                                onClick={() => react(r.emoji)}
                                title={r.userIds.map((id) => (id === me ? "You" : nameOf(id))).filter(Boolean).join(", ")}
                                className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] ${
                                    mineR ? "border-brand-300 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-body hover:bg-row-hover"
                                }`}
                            >
                                {r.emoji}
                                <span className="font-semibold">{r.userIds.length}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <span className="flex items-center gap-1 px-1 text-[11px] text-subtle">
                {clock(m.at)}
                {m.edited && <span>· Edited</span>}
                {kind === "direct" && seen === "seen" && (
                    <span className="inline-flex items-center gap-0.5 text-info-700"><CheckCheck size={13} /> Seen</span>
                )}
                {kind === "direct" && seen === "sent" && (
                    <span className="inline-flex items-center gap-0.5"><Check size={13} /> Sent</span>
                )}
            </span>
        </div>
    );
}

// ─── Composer ────────────────────────────────────────────────────────────────
type Pending = {
    key: string;
    name: string;
    size: number;
    status: "uploading" | "done" | "error";
    progress: number;
    attachment?: ChatAttachment;
    error?: string;
};
type ComposerHandle = { addFiles: (files: File[]) => void };

const Composer = forwardRef<ComposerHandle, {
    thread: ChatThread;
    role: "student" | "trainer";
    members: ChatMember[];
    ensureId: () => Promise<string>;
    replyTo: ChatMessage | null;
    onCancelReply: () => void;
    onLocked: () => void;
}>(function Composer({ thread, role, members, ensureId, replyTo, onCancelReply, onLocked }, ref) {
    const queryClient = useQueryClient();
    const [text, setText] = useState("");
    const [pending, setPending] = useState<Pending[]>([]);
    const [sending, setSending] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setText("");
        setPending([]);
    }, [thread.key]);
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
        el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
    }, [text]);
    useEffect(() => {
        if (replyTo) inputRef.current?.focus();
    }, [replyTo]);

    const addFiles = useCallback(async (list: File[]) => {
        if (!list.length) return;
        const room = MAX_FILES - pending.length;
        if (list.length > room) toast.info(`Up to ${MAX_FILES} files in one message`);
        const picked = list.slice(0, Math.max(0, room));
        if (!picked.length) return;
        let id: string;
        try {
            id = await ensureId();
        } catch (e) {
            toast.error(chatError(e).message);
            return;
        }
        for (const f of picked) {
            if (f.size > MAX_FILE_BYTES) {
                toast.error(`${f.name} is larger than 25 MB`);
                continue;
            }
            const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setPending((p) => [...p, { key, name: f.name, size: f.size, status: "uploading", progress: 0 }]);
            const patch = (x: Partial<Pending>) => setPending((p) => p.map((it) => (it.key === key ? { ...it, ...x } : it)));
            uploadChatFile(id, f, (progress) => patch({ progress }))
                .then((attachment) => patch({ status: "done", attachment, progress: 100 }))
                .catch((e) => {
                    const err = chatError(e);
                    if (err.status === 423) onLocked();
                    patch({ status: "error", error: err.message });
                });
        }
    }, [ensureId, onLocked, pending.length]);
    useImperativeHandle(ref, () => ({ addFiles }), [addFiles]);

    // @mention: the word being typed after an @, in groups.
    const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
    const [mIndex, setMIndex] = useState(0);
    const options = useMemo(() => {
        if (!mention) return [];
        const q = mention.query.toLowerCase();
        return members.filter((p) => !p.me && p.name.toLowerCase().includes(q)).slice(0, 6);
    }, [mention, members]);
    const detectMention = (value: string, caret: number) => {
        if (thread.kind !== "group" || !members.length) return setMention(null);
        const hit = value.slice(0, caret).match(/(^|\s)@([^\s@]{0,24}(?: [^\s@]{0,24})?)$/);
        if (!hit) return setMention(null);
        setMention({ start: caret - hit[2].length - 1, query: hit[2] });
        setMIndex(0);
    };
    const pickMention = (p: ChatMember) => {
        const el = inputRef.current;
        if (!mention) return;
        const caret = el?.selectionStart ?? text.length;
        const insert = `@${p.name} `;
        setText(text.slice(0, mention.start) + insert + text.slice(caret));
        setMention(null);
        requestAnimationFrame(() => {
            const at = mention.start + insert.length;
            el?.focus();
            el?.setSelectionRange(at, at);
        });
    };

    const insertAtCaret = (snippet: string) => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? text.length;
        const end = el?.selectionEnd ?? text.length;
        setText(text.slice(0, start) + snippet + text.slice(end));
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(start + snippet.length, start + snippet.length);
        });
    };

    const addCode = () => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? text.length;
        const end = el?.selectionEnd ?? text.length;
        const picked = text.slice(start, end);
        const before = text.slice(0, start);
        const lead = before && !before.endsWith("\n") ? "\n" : "";
        setText(before + `${lead}\`\`\`\n${picked}\n\`\`\`\n` + text.slice(end));
        requestAnimationFrame(() => {
            const caret = before.length + lead.length + 4 + picked.length;
            el?.focus();
            el?.setSelectionRange(caret, caret);
        });
    };

    const ready = pending.filter((p) => p.status === "done" && p.attachment);
    const uploading = pending.some((p) => p.status === "uploading");
    const canSend = !sending && !uploading && Boolean(text.trim() || ready.length);

    const send = async () => {
        const body = text.replace(/\s+$/, "");
        if (!canSend) return;
        setSending(true);
        try {
            const id = await ensureId();
            const mentions = members.filter((p) => !p.me && body.includes(`@${p.name}`)).map((p) => p.id);
            const message = await sendChatMessage(id, {
                text: body,
                attachments: ready.map((p) => p.attachment as ChatAttachment),
                replyTo: replyTo?.id,
                mentions,
            });
            queryClient.setQueryData<ChatPage>(chatKeys.messages(id), (p) => appendToThread(p, { ...message, mine: true }));
            setText("");
            setPending([]);
            onCancelReply();
            queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
            if (ready.length || /https?:\/\//.test(body)) queryClient.invalidateQueries({ queryKey: chatKeys.shared(id) });
        } catch (e) {
            const err = chatError(e);
            if (err.status === 423) onLocked();
            else toast.error(err.message);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                send();
            }}
            className="border-t border-ink-200 bg-white px-3 py-3 sm:px-4"
        >
            {replyTo && (
                <div className="mb-2 flex items-start gap-2 rounded-lg border-l-[3px] border-brand-400 bg-[#F6F7F9] px-3 py-1.5 text-[12.5px]">
                    <CornerUpLeft size={14} className="mt-0.5 flex-shrink-0 text-subtle" />
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-heading">Replying to {replyTo.mine ? "yourself" : replyTo.senderName}</span>
                        <span className="block truncate text-subtle">{replyPreview(replyTo)}</span>
                    </span>
                    <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="rounded p-0.5 text-subtle hover:bg-row-hover">
                        <X size={14} />
                    </button>
                </div>
            )}
            {pending.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {pending.map((p) => (
                        <span
                            key={p.key}
                            title={p.error || p.name}
                            className={`inline-flex max-w-[240px] items-center gap-2 rounded-lg border px-2 py-1.5 text-[12px] ${
                                p.status === "error" ? "border-danger-200 bg-danger-50 text-danger-700" : "border-ink-200 bg-[#F6F7F9] text-body"
                            }`}
                        >
                            {p.status === "uploading" ? <Loader2 size={14} className="flex-shrink-0 animate-spin" /> : <FileGlyph name={p.name} size={15} />}
                            <span className="min-w-0 truncate">{p.name}</span>
                            <span className="flex-shrink-0 text-faint">
                                {p.status === "uploading" ? `${p.progress}%` : p.status === "error" ? "Failed" : fileSize(p.size)}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPending((list) => list.filter((x) => x.key !== p.key))}
                                aria-label={`Remove ${p.name}`}
                                className="flex-shrink-0 rounded p-0.5 hover:bg-white"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative flex items-end gap-0.5 rounded-xl border border-ink-200 bg-white py-1 pl-3 pr-1 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                {options.length > 0 && (
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-[280px] overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lg" role="listbox" aria-label="Mention someone">
                        {options.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                role="option"
                                aria-selected={i === mIndex}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pickMention(p);
                                }}
                                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] ${i === mIndex ? "bg-row-hover" : ""}`}
                            >
                                <PersonAvatar seed={p.id} name={p.name} online={p.online} size={26} />
                                <span className="min-w-0 flex-1 truncate text-heading">{p.name}</span>
                                {p.role === "trainer" && <span className="text-[10.5px] font-semibold text-brand-700">Trainer</span>}
                            </button>
                        ))}
                    </div>
                )}
                <label className="min-w-0 flex-1">
                    <span className="sr-only">Message</span>
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={text}
                        // Escape here closes the mention list or the reply first.
                        data-esc-local={options.length > 0 || Boolean(replyTo) || undefined}
                        maxLength={MAX_TEXT}
                        onChange={(e) => {
                            setText(e.target.value);
                            detectMention(e.target.value, e.target.selectionStart);
                        }}
                        onBlur={() => setMention(null)}
                        onPaste={(e) => {
                            const files = Array.from(e.clipboardData?.files || []);
                            if (files.length) {
                                e.preventDefault();
                                addFiles(files);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (options.length) {
                                if (e.key === "ArrowDown") { e.preventDefault(); setMIndex((i) => (i + 1) % options.length); return; }
                                if (e.key === "ArrowUp") { e.preventDefault(); setMIndex((i) => (i - 1 + options.length) % options.length); return; }
                                if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickMention(options[mIndex]); return; }
                                if (e.key === "Escape") { e.preventDefault(); setMention(null); return; }
                            }
                            if (e.key === "Escape" && replyTo) { onCancelReply(); return; }
                            // Enter sends; Shift+Enter (and Enter inside a code fence) is a new line.
                            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                            const openFences = (text.slice(0, e.currentTarget.selectionStart).match(/```/g) || []).length;
                            if (openFences % 2 === 1) return;
                            e.preventDefault();
                            send();
                        }}
                        placeholder={
                            role === "student" && thread.peerRole !== "student" && thread.kind === "direct"
                                ? "Type your doubt…"
                                : thread.kind === "group" ? "Type a message, @ to mention" : "Type a message"
                        }
                        className="block max-h-40 min-h-9 w-full resize-none bg-transparent py-2 text-[13.5px] text-heading outline-none"
                    />
                </label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" aria-label="Emoji" title="Emoji" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-body hover:bg-row-hover">
                            <Smile size={18} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        side="top"
                        className="grid w-[300px] grid-cols-8 gap-0.5 p-2"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                        {EMOJIS.map((em) => (
                            <DropdownMenuItem
                                key={em}
                                onSelect={() => insertAtCaret(em)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-0 text-[18px]"
                            >
                                {em}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <IconButton label="Attach files" onClick={() => fileRef.current?.click()}>
                    <Paperclip size={18} />
                </IconButton>
                <IconButton label="Add code" onClick={addCode}>
                    <Code2 size={18} />
                </IconButton>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                        addFiles(Array.from(e.target.files || []));
                        e.target.value = "";
                    }}
                />
                <span className="mx-1 mb-2 h-5 w-px self-end bg-ink-200" aria-hidden="true" />
                <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="Send"
                    title={uploading ? "Wait for the files to upload" : "Send"}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:bg-transparent disabled:text-faint"
                >
                    {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
            </div>
            {text.length > MAX_TEXT - 500 && (
                <span className="mt-1 block text-right text-[11px] text-subtle">{text.length} / {MAX_TEXT}</span>
            )}
        </form>
    );
});

// ─── Shared tab ──────────────────────────────────────────────────────────────
function SharedPanel({
    conversationId, canPost, ensureId, onLocked,
}: {
    conversationId: string | null;
    canPost: boolean;
    ensureId: () => Promise<string>;
    onLocked: () => void;
}) {
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: chatKeys.shared(conversationId || "none"),
        queryFn: () => fetchChatShared(conversationId as string),
        enabled: Boolean(conversationId),
        staleTime: 15_000,
    });
    const [kind, setKind] = useState<"recent" | "files" | "links">("recent");
    const [q, setQ] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    type Row = { key: string; name: string; url: string; at: string; senderName: string; size?: number; mime?: string; link: boolean };
    const rows = useMemo(() => {
        const files: Row[] = (data?.files || []).map((f, i) => ({ key: `f${i}`, name: f.name, url: f.url, at: f.at, senderName: f.senderName, size: f.size, mime: f.mime, link: false }));
        const links: Row[] = (data?.links || []).map((l, i) => ({ key: `l${i}`, name: l.url.replace(/^https?:\/\//, ""), url: l.url, at: l.at, senderName: l.senderName, link: true }));
        const pool = kind === "files" ? files : kind === "links" ? links : [...files, ...links];
        const needle = q.trim().toLowerCase();
        return pool
            .filter((r) => !needle || [r.name, r.senderName].some((v) => v.toLowerCase().includes(needle)))
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    }, [data, kind, q]);

    const upload = async (list: File[]) => {
        if (!list.length) return;
        setUploading(true);
        try {
            const id = await ensureId();
            const attachments: ChatAttachment[] = [];
            for (const f of list.slice(0, MAX_FILES)) {
                if (f.size > MAX_FILE_BYTES) {
                    toast.error(`${f.name} is larger than 25 MB`);
                    continue;
                }
                attachments.push(await uploadChatFile(id, f));
            }
            if (!attachments.length) return;
            const message = await sendChatMessage(id, { text: "", attachments });
            queryClient.setQueryData<ChatPage>(chatKeys.messages(id), (p) => appendToThread(p, { ...message, mine: true }));
            queryClient.invalidateQueries({ queryKey: chatKeys.shared(id) });
            queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
            toast.success(attachments.length === 1 ? "File shared" : `${attachments.length} files shared`);
        } catch (e) {
            const err = chatError(e);
            if (err.status === 423) onLocked();
            else toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    const chip = (id: typeof kind, label: string) => (
        <button
            key={id}
            type="button"
            aria-pressed={kind === id}
            onClick={() => setKind(id)}
            className={`h-8 rounded-full border px-3.5 text-[12.5px] transition-colors ${
                kind === id ? "border-heading bg-heading font-semibold text-white" : "border-ink-300 text-body hover:bg-row-hover"
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 px-4 py-3 sm:px-5">
                {chip("recent", "Recent")}
                {chip("files", `Files${data ? ` (${data.files.length})` : ""}`)}
                {chip("links", `Links${data ? ` (${data.links.length})` : ""}`)}
                <label className="ml-auto flex h-8 min-w-[150px] flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-2.5 text-subtle focus-within:border-brand-400 sm:max-w-[220px]">
                    <Search size={14} className="flex-shrink-0" />
                    <span className="sr-only">Filter by keyword</span>
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Filter by keyword"
                        className="min-w-0 flex-1 bg-transparent text-[12.5px] text-heading outline-none"
                    />
                </label>
                {canPost && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-body hover:bg-row-hover disabled:opacity-60"
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Upload
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            hidden
                            onChange={(e) => {
                                upload(Array.from(e.target.files || []));
                                e.target.value = "";
                            }}
                        />
                    </>
                )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center text-subtle"><Loader2 size={20} className="animate-spin" /></div>
                ) : error ? (
                    <div className="px-5 py-10 text-center text-[13px] text-danger-700">{chatError(error).message}</div>
                ) : !rows.length ? (
                    <div className="px-5 py-14 text-center text-[13px] text-subtle">
                        {q.trim()
                            ? "Nothing matches that keyword."
                            : kind === "links" ? "No links shared yet." : kind === "files" ? "No files shared yet." : "Files and links shared in this chat show here."}
                    </div>
                ) : (
                    <table className="w-full table-fixed border-collapse text-left">
                        <thead>
                            <tr className="border-b border-ink-200 text-[11.5px] uppercase tracking-wide text-subtle">
                                <th className="px-4 py-2 font-semibold sm:px-5">Name</th>
                                <th className="hidden w-[170px] px-3 py-2 font-semibold md:table-cell">Shared by</th>
                                <th className="w-[130px] px-4 py-2 text-right font-semibold sm:px-5">Date shared</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.key} className="border-b border-ink-100 hover:bg-row-hover">
                                    <td className="px-4 py-2.5 sm:px-5">
                                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6]">
                                                {r.link ? <Link2 size={16} className="text-info-700" /> : <FileGlyph name={r.name} mime={r.mime} size={16} />}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-[13.5px] font-medium text-heading hover:underline">{r.name}</span>
                                                <span className="block truncate text-[11.5px] text-subtle md:hidden">{r.senderName}</span>
                                                {!r.link && r.size ? <span className="hidden text-[11.5px] text-subtle md:block">{fileSize(r.size)}</span> : null}
                                            </span>
                                        </a>
                                    </td>
                                    <td className="hidden truncate px-3 py-2.5 text-[13px] text-body md:table-cell">{r.senderName}</td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[13px] text-body sm:px-5">{shortDate(r.at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ─── Notes tab ───────────────────────────────────────────────────────────────
function NotesPanel({
    conversationId, ensureId, defaultCanEdit, kind,
}: {
    conversationId: string | null;
    ensureId: () => Promise<string>;
    defaultCanEdit: boolean;
    kind: "direct" | "group";
}) {
    const queryClient = useQueryClient();
    const { data: notes, isLoading } = useQuery({
        queryKey: chatKeys.notes(conversationId || "none"),
        queryFn: () => fetchChatNotes(conversationId as string),
        enabled: Boolean(conversationId),
        staleTime: 15_000,
    });
    const canEdit = notes ? notes.canEdit : defaultCanEdit;
    const [text, setText] = useState("");
    // What the server last had: only then may a refetch replace the text.
    const synced = useRef("");
    const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

    useEffect(() => {
        if (notes && text === synced.current) {
            setText(notes.text);
            synced.current = notes.text;
        }
        // Only a server change should land here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notes]);

    useEffect(() => {
        if (!canEdit || text === synced.current) return;
        const t = window.setTimeout(async () => {
            setState("saving");
            try {
                const id = await ensureId();
                const saved = await saveChatNotes(id, text);
                synced.current = saved.text;
                queryClient.setQueryData(chatKeys.notes(id), saved);
                setState("saved");
            } catch (e) {
                toast.error(chatError(e).message);
                setState("error");
            }
        }, 900);
        return () => window.clearTimeout(t);
    }, [text, canEdit, ensureId, queryClient]);

    const status =
        state === "saving" ? "Saving…"
            : state === "error" ? "Not saved"
                : notes?.updatedAt ? `Saved · ${notes.updatedBy ? `${notes.updatedBy}, ` : ""}${dayLabel(notes.updatedAt)} ${clock(notes.updatedAt)}`
                    : "";

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-2.5 sm:px-5">
                <span className="text-[14px] font-semibold text-heading">Notes</span>
                <span className="truncate text-[12px] text-subtle">{status}</span>
                {!canEdit && (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-subtle" title="Only trainers can edit">
                        <Lock size={14} /> Only trainers can edit
                    </span>
                )}
            </div>
            {isLoading ? (
                <div className="flex h-40 items-center justify-center text-subtle"><Loader2 size={20} className="animate-spin" /></div>
            ) : !canEdit && !text ? (
                <div className="px-5 py-14 text-center text-[13px] text-subtle">No notes yet.</div>
            ) : (
                <textarea
                    value={text}
                    readOnly={!canEdit}
                    maxLength={20000}
                    onChange={(e) => {
                        setText(e.target.value);
                        setState("idle");
                    }}
                    placeholder={kind === "group" ? "Just start typing… everyone in the batch can read these notes." : "Just start typing… you both can edit these notes."}
                    className="min-h-0 flex-1 resize-none bg-white px-4 py-4 text-[14px] leading-relaxed text-heading outline-none sm:px-6"
                />
            )}
        </div>
    );
}

// ─── Search ──────────────────────────────────────────────────────────────────
function SearchResults({ conversationId, q, onPick }: { conversationId: string | null; q: string; onPick: (m: ChatMessage) => void }) {
    const { data, isFetching, error } = useQuery({
        queryKey: chatKeys.search(conversationId || "none", q),
        queryFn: () => searchChatMessages(conversationId as string, q),
        enabled: Boolean(conversationId) && q.length >= 2,
        staleTime: 10_000,
    });
    if (q.length < 2) return <div className="px-5 py-14 text-center text-[13px] text-subtle">Type at least 2 letters to search this chat.</div>;
    if (!conversationId) return <div className="px-5 py-14 text-center text-[13px] text-subtle">No messages yet.</div>;
    if (isFetching && !data) return <div className="flex h-40 items-center justify-center text-subtle"><Loader2 size={20} className="animate-spin" /></div>;
    if (error) return <div className="px-5 py-10 text-center text-[13px] text-danger-700">{chatError(error).message}</div>;
    if (!data?.length) return <div className="px-5 py-14 text-center text-[13px] text-subtle">No messages match “{q}”.</div>;
    const lower = q.toLowerCase();
    return (
        <div className="flex flex-col py-1">
            <div className="px-5 py-2 text-[12px] text-subtle">{data.length === 50 ? "Latest 50 matches" : `${data.length} match${data.length === 1 ? "" : "es"}`}</div>
            {data.map((m) => {
                const flat = m.text.replace(/```/g, "").replace(/\s+/g, " ");
                const at = flat.toLowerCase().indexOf(lower);
                const from = Math.max(0, at - 40);
                const snippet = (from ? "…" : "") + flat.slice(from, from + 160);
                const i = snippet.toLowerCase().indexOf(lower);
                return (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => onPick(m)}
                        className="flex w-full items-start gap-3 px-5 py-2.5 text-left hover:bg-row-hover"
                    >
                        <PersonAvatar seed={m.senderId} name={m.senderName} size={30} />
                        <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-2">
                                <span className="truncate text-[13px] font-semibold text-heading">{m.mine ? "You" : m.senderName}</span>
                                <span className="flex-shrink-0 text-[11.5px] text-subtle">{dayLabel(m.at)} {clock(m.at)}</span>
                            </span>
                            <span className="block text-[13px] leading-snug text-body">
                                {i < 0 ? snippet : (
                                    <>
                                        {snippet.slice(0, i)}
                                        <mark className="rounded bg-amber-100 px-0.5 text-heading">{snippet.slice(i, i + q.length)}</mark>
                                        {snippet.slice(i + q.length)}
                                    </>
                                )}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── The conversation ────────────────────────────────────────────────────────
export default function ThreadView({
    thread,
    role,
    onBack,
    onLocked,
    inDialog = false,
}: {
    thread: ChatThread;
    role: "student" | "trainer";
    onBack: () => void;
    onLocked: () => void;
    // Leaves the top-right corner to the dialog's close button.
    inDialog?: boolean;
}) {
    const queryClient = useQueryClient();
    const me = getUserId() || "";
    // A contact nobody has messaged yet has no conversation; whatever needs
    // one (a send, an upload, notes) opens it.
    const [conversationId, setConversationId] = useState<string | null>(thread.id);
    useEffect(() => setConversationId(thread.id), [thread.key, thread.id]);
    const opening = useRef<Promise<string> | null>(null);
    const ensureId = useCallback(async () => {
        if (conversationId) return conversationId;
        if (!opening.current) {
            opening.current = openChat(thread).finally(() => {
                opening.current = null;
            });
        }
        const id = await opening.current;
        queryClient.setQueryData<ChatPage>(chatKeys.messages(id), (p) => p ?? { messages: [], hasMore: false, peerReadAt: null, canPost: thread.canPost });
        setConversationId(id);
        queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
        return id;
    }, [conversationId, thread, queryClient]);
    // A group always has one (it is the batch's), so open it for its People.
    useEffect(() => {
        if (thread.kind === "group" && !conversationId) ensureId().catch(() => {});
    }, [thread.kind, conversationId, ensureId]);

    const [tab, setTab] = useState<Tab>("chat");
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchRaw, setSearchRaw] = useState("");
    const [searchQ, setSearchQ] = useState("");
    useEffect(() => {
        const t = window.setTimeout(() => setSearchQ(searchRaw.trim()), 300);
        return () => window.clearTimeout(t);
    }, [searchRaw]);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    useEffect(() => {
        setTab("chat");
        setSearchOpen(false);
        setSearchRaw("");
        setReplyTo(null);
    }, [thread.key]);

    const { data: page, isLoading, error } = useQuery({
        queryKey: chatKeys.messages(conversationId || "none"),
        queryFn: () => fetchChatMessages(conversationId as string),
        enabled: Boolean(conversationId),
        staleTime: 30_000,
        // The app default skips refetch on mount; a reopened chat must catch
        // anything the socket missed while it was closed.
        refetchOnMount: "always",
        retry: (count, e) => chatError(e).status !== 423 && count < 2,
    });
    const status = error ? chatError(error).status : 0;
    useEffect(() => {
        if (status === 423) onLocked();
    }, [status, onLocked]);

    const { data: members = [] } = useQuery({
        queryKey: chatKeys.members(conversationId || "none"),
        queryFn: () => fetchChatMembers(conversationId as string),
        enabled: Boolean(conversationId) && thread.kind === "group",
        staleTime: 60_000,
    });
    const names = useMemo(() => new Map(members.map((p) => [p.id, p.name])), [members]);
    const nameOf = useCallback(
        (id: string) => names.get(id) || (thread.kind === "direct" && id === thread.peerId ? thread.title : ""),
        [names, thread],
    );

    // Opened → read. Also re-marks when a message lands while the thread is
    // open (the page count changes).
    const count = page?.messages.length || 0;
    useEffect(() => {
        if (!conversationId || !page) return;
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        markChatRead(conversationId)
            .then(() => {
                queryClient.setQueryData(chatKeys.inbox, (inbox: { threads: ChatThread[] } | undefined) =>
                    inbox ? { ...inbox, threads: inbox.threads.map((t) => (t.key === thread.key ? { ...t, unread: 0 } : t)) } : inbox);
                queryClient.invalidateQueries({ queryKey: chatKeys.summary });
            })
            .catch(() => {});
    }, [conversationId, count, page, queryClient, thread.key]);

    // Seen ticks: the peer opening this chat.
    useChatLive({
        onRead: (e) => {
            if (e.conversationId !== conversationId || e.userId === me) return;
            queryClient.setQueryData<ChatPage>(chatKeys.messages(e.conversationId), (p) => (p ? { ...p, peerReadAt: e.at } : p));
        },
    });

    // Stay at the bottom as messages arrive; loading earlier keeps the place;
    // a jump to a quoted or found message scrolls to that one instead.
    const scrollRef = useRef<HTMLDivElement>(null);
    const keepOffset = useRef<number | null>(null);
    const jumping = useRef(false);
    // Whether the reader is at the newest message: an image that finishes
    // loading then keeps them there.
    const atBottom = useRef(true);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || tab !== "chat" || searchOpen) return;
        if (jumping.current) return;
        if (keepOffset.current !== null) {
            el.scrollTop = el.scrollHeight - keepOffset.current;
            keepOffset.current = null;
        } else {
            el.scrollTop = el.scrollHeight;
        }
    }, [count, conversationId, tab, searchOpen]);

    // Image loads don't bubble; the capture phase still sees them.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onLoad = () => {
            if (atBottom.current && !jumping.current) el.scrollTop = el.scrollHeight;
        };
        el.addEventListener("load", onLoad, true);
        return () => el.removeEventListener("load", onLoad, true);
    }, [tab, searchOpen, conversationId]);

    const mergeOlder = (id: string, older: ChatPage) =>
        queryClient.setQueryData<ChatPage>(chatKeys.messages(id), (p) =>
            p ? { ...p, hasMore: older.hasMore, messages: [...older.messages.filter((m) => !p.messages.some((x) => x.id === m.id)), ...p.messages] } : p);

    const [loadingEarlier, setLoadingEarlier] = useState(false);
    const loadEarlier = async () => {
        if (!conversationId || !page?.messages.length) return;
        setLoadingEarlier(true);
        try {
            const older = await fetchChatMessages(conversationId, page.messages[0].at);
            keepOffset.current = scrollRef.current ? scrollRef.current.scrollHeight - scrollRef.current.scrollTop : null;
            mergeOlder(conversationId, older);
        } catch (e) {
            toast.error(chatError(e).message);
        } finally {
            setLoadingEarlier(false);
        }
    };

    const [flashId, setFlashId] = useState<string | null>(null);
    const jumpTo = async (id: string) => {
        if (!conversationId) return;
        jumping.current = true;
        setTab("chat");
        setSearchOpen(false);
        try {
            for (let i = 0; i < 12; i++) {
                const cur = queryClient.getQueryData<ChatPage>(chatKeys.messages(conversationId));
                if (!cur || cur.messages.some((m) => m.id === id)) break;
                if (!cur.hasMore || !cur.messages.length) break;
                mergeOlder(conversationId, await fetchChatMessages(conversationId, cur.messages[0].at));
            }
        } catch (e) {
            toast.error(chatError(e).message);
        }
        const found = queryClient.getQueryData<ChatPage>(chatKeys.messages(conversationId))?.messages.some((m) => m.id === id);
        if (!found) {
            jumping.current = false;
            toast.info("That message is no longer in this chat.");
            return;
        }
        setFlashId(id);
    };
    useEffect(() => {
        if (!flashId) return;
        const raf = requestAnimationFrame(() => {
            document.getElementById(`chatmsg-${flashId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
            jumping.current = false;
        });
        const t = window.setTimeout(() => setFlashId(null), 1800);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(t);
        };
    }, [flashId]);

    const composerRef = useRef<ComposerHandle>(null);
    const [dragging, setDragging] = useState(false);

    const canPost = page ? page.canPost : thread.canPost;
    const canModerate = Boolean(page?.canModerate);
    const messages = page?.messages || [];
    const peerReadAt = page?.peerReadAt ? new Date(page.peerReadAt).getTime() : 0;
    // Seen sits under my latest message only, like most chats.
    const lastMine = [...messages].reverse().find((m) => m.mine && !m.deleted);
    const memberCount = Number((thread.subtitle.match(/\d+/) || ["0"])[0]) || 0;

    const tabButton = (id: Tab, label: string) => (
        <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
                setTab(id);
                setSearchOpen(false);
            }}
            className={`relative h-10 px-1 text-[13.5px] transition-colors ${
                tab === id ? "font-semibold text-heading" : "text-body hover:text-heading"
            }`}
        >
            {label}
            {tab === id && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-brand-500" />}
        </button>
    );

    return (
        <section aria-label={`Chat with ${thread.title}`} className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className={`flex items-center gap-3 px-4 pb-1 pt-3 sm:px-5 ${inDialog ? "pr-14 sm:pr-14" : ""}`}>
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to chats"
                    className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-subtle hover:bg-row-hover md:hidden"
                >
                    <ArrowLeft size={18} />
                </button>
                <Avatar thread={thread} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-heading">{thread.title}</span>
                        {thread.kind === "group" && thread.trainerOnly && (
                            <span className="rounded-md bg-info-50 px-1.5 py-px text-[10.5px] font-semibold text-info-700">Announcements</span>
                        )}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-subtle">
                        {thread.online && (
                            <span className="inline-flex flex-shrink-0 items-center gap-1 font-medium text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                                Online ·
                            </span>
                        )}
                        <span className="truncate">{`${thread.subtitle} · ${thread.courseName}`}</span>
                    </span>
                </span>
                <IconButton
                    label={searchOpen ? "Close search" : "Search this chat"}
                    active={searchOpen}
                    onClick={() => {
                        setSearchOpen((v) => !v);
                        setSearchRaw("");
                    }}
                >
                    {searchOpen ? <X size={18} /> : <Search size={18} />}
                </IconButton>
                {thread.kind === "group" && <PeopleMenu members={members} fallbackCount={memberCount} />}
            </header>

            <nav role="tablist" aria-label="Chat sections" className="flex items-end gap-5 border-b border-ink-200 px-4 sm:px-5">
                {tabButton("chat", "Chat")}
                {tabButton("shared", "Shared")}
                {tabButton("notes", "Notes")}
            </nav>

            {searchOpen && (
                <div className="border-b border-ink-200 bg-white px-4 py-2 sm:px-5">
                    <label className="flex h-9 items-center gap-2 rounded-lg border border-ink-200 px-3 text-subtle focus-within:border-brand-400">
                        <Search size={14} className="flex-shrink-0" />
                        <span className="sr-only">Search this chat</span>
                        <input
                            autoFocus
                            data-esc-local="true"
                            type="search"
                            value={searchRaw}
                            onChange={(e) => setSearchRaw(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                            placeholder={`Search in ${thread.title}`}
                            className="min-w-0 flex-1 bg-transparent text-[13px] text-heading outline-none"
                        />
                    </label>
                </div>
            )}

            {searchOpen ? (
                <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                    <SearchResults conversationId={conversationId} q={searchQ} onPick={(m) => jumpTo(m.id)} />
                </div>
            ) : tab === "shared" ? (
                <SharedPanel conversationId={conversationId} canPost={canPost} ensureId={ensureId} onLocked={onLocked} />
            ) : tab === "notes" ? (
                <NotesPanel
                    conversationId={conversationId}
                    ensureId={ensureId}
                    defaultCanEdit={thread.kind === "direct" || role !== "student"}
                    kind={thread.kind}
                />
            ) : (
                <div
                    className="relative flex min-h-0 flex-1 flex-col"
                    onDragOver={(e) => {
                        if (!canPost || !Array.from(e.dataTransfer.types).includes("Files")) return;
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                    }}
                    onDrop={(e) => {
                        if (!canPost) return;
                        e.preventDefault();
                        setDragging(false);
                        composerRef.current?.addFiles(Array.from(e.dataTransfer.files || []));
                    }}
                >
                    {dragging && (
                        <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/80 text-[14px] font-semibold text-brand-800">
                            Drop files to share
                        </div>
                    )}
                    <div
                        ref={scrollRef}
                        onScroll={(e) => {
                            const el = e.currentTarget;
                            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                        }}
                        className="min-h-0 flex-1 overflow-y-auto bg-[#FAFBFC] px-4 py-4 sm:px-5"
                    >
                        {!conversationId ? (
                            <div className="flex h-full items-center justify-center text-center text-[13px] text-subtle">
                                {thread.kind === "group" ? "No messages in this group yet." : `No messages yet — say hello to ${thread.title}.`}
                            </div>
                        ) : isLoading ? (
                            <div className="flex h-full items-center justify-center text-subtle">
                                <Loader2 size={20} className="animate-spin" />
                            </div>
                        ) : error && status !== 423 && !page ? (
                            <div className="flex h-full items-center justify-center text-[13px] text-danger-700">{chatError(error).message}</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {page?.hasMore && (
                                    <button
                                        type="button"
                                        onClick={loadEarlier}
                                        disabled={loadingEarlier}
                                        className="mx-auto mb-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 text-[12px] font-medium text-body hover:bg-row-hover disabled:opacity-60"
                                    >
                                        {loadingEarlier && <Loader2 size={12} className="animate-spin" />}
                                        Load earlier messages
                                    </button>
                                )}
                                {!messages.length && (
                                    <div className="py-16 text-center text-[13px] text-subtle">
                                        {thread.kind === "group" ? "No messages in this group yet." : `No messages yet — say hello to ${thread.title}.`}
                                    </div>
                                )}
                                {messages.map((m, i) => {
                                    const prev = messages[i - 1];
                                    const newDay = !prev || dayStart(new Date(prev.at)) !== dayStart(new Date(m.at));
                                    const showSender = thread.kind === "group" && !m.mine && (newDay || prev?.senderId !== m.senderId);
                                    const seen = m.id === lastMine?.id ? (peerReadAt >= new Date(m.at).getTime() ? "seen" : "sent") : null;
                                    return (
                                        <React.Fragment key={m.id}>
                                            {newDay && (
                                                <div className="my-1 self-center rounded-full bg-[#EEF0F4] px-3 py-0.5 text-[11.5px] font-semibold text-subtle">
                                                    {dayLabel(m.at)}
                                                </div>
                                            )}
                                            <MessageItem
                                                m={m}
                                                kind={thread.kind}
                                                showSender={showSender}
                                                seen={seen}
                                                canModerate={canModerate}
                                                nameOf={nameOf}
                                                me={me}
                                                flash={flashId === m.id}
                                                onReply={setReplyTo}
                                                onJump={jumpTo}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {canPost ? (
                        <Composer
                            ref={composerRef}
                            thread={thread}
                            role={role}
                            members={members}
                            ensureId={ensureId}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                            onLocked={onLocked}
                        />
                    ) : (
                        <div className="flex items-center gap-2 border-t border-ink-200 bg-white px-4 py-3.5 text-[13px] text-subtle">
                            <Megaphone size={16} className="flex-shrink-0" />
                            Only trainers can post in this group.
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
