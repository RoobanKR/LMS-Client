"use client";

// Messages — trainer ↔ student chat and one group per batch, for every course
// whose Course Setup turned Chat on. The server decides who may talk to whom
// (batch roster); this page lists what it returns and talks over the shared
// socket for live updates.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Check, CheckCheck, Code2, Loader2, Lock, Megaphone, MessageSquare, Search, Send, Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { getUserId } from "@/lib/session";
import {
    chatError, chatKeys, fetchChatInbox, fetchChatMessages, markChatRead, openChat, sendChatMessage,
    type ChatPage, type ChatThread,
} from "./api/peopleChat";
import { appendToThread, useChatLive } from "./useChatLive";

const MAX_TEXT = 4000;

// ─── Time labels ─────────────────────────────────────────────────────────────
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.round((dayStart(new Date()) - dayStart(d)) / 86_400_000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};
const listTime = (iso: string | null) => {
    if (!iso) return "";
    const label = dayLabel(iso);
    return label === "Today" ? clock(iso) : label;
};

// ─── Avatars ─────────────────────────────────────────────────────────────────
const AVATAR_TONES = [
    "bg-orange-100 text-orange-800",
    "bg-emerald-100 text-emerald-800",
    "bg-sky-100 text-sky-800",
    "bg-violet-100 text-violet-800",
    "bg-rose-100 text-rose-800",
    "bg-amber-100 text-amber-800",
];
const toneOf = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

function Avatar({ thread, size = 40 }: { thread: ChatThread; size?: number }) {
    if (thread.kind === "group") {
        return (
            <span
                className="flex flex-shrink-0 items-center justify-center rounded-xl bg-info-50 text-info-700"
                style={{ width: size, height: size }}
                aria-hidden="true"
            >
                {thread.trainerOnly ? <Megaphone size={size * 0.45} /> : <Users size={size * 0.45} />}
            </span>
        );
    }
    return (
        <span
            className={`flex flex-shrink-0 items-center justify-center rounded-full font-semibold ${toneOf(thread.peerId || thread.title)}`}
            style={{ width: size, height: size, fontSize: size * 0.36 }}
            aria-hidden="true"
        >
            {(thread.title.trim()[0] || "?").toUpperCase()}
        </span>
    );
}

function UnreadBadge({ n }: { n: number }) {
    if (!n) return null;
    return (
        <span className="inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
            {n > 99 ? "99+" : n}
        </span>
    );
}

// ─── Message text: ``` fences become code blocks ─────────────────────────────
function MessageBody({ text, mine }: { text: string; mine: boolean }) {
    const parts = text.split(/```/);
    return (
        <>
            {parts.map((part, i) => {
                if (i % 2 === 1) {
                    // A language tag on the fence line ("```java") is dropped.
                    const code = part.replace(/^[^\n]*\n/, (line) => (/^\s*\w*\s*\n$/.test(line) ? "" : line)).replace(/\n$/, "");
                    return (
                        <pre
                            key={i}
                            className="my-1 overflow-x-auto whitespace-pre rounded-lg bg-[#1A2332] px-3 py-2 font-mono text-[12px] leading-relaxed text-slate-200"
                        >
                            {code}
                        </pre>
                    );
                }
                const t = part.replace(/^\n+|\n+$/g, "");
                if (!t) return null;
                return (
                    <span key={i} className={`block whitespace-pre-wrap break-words ${mine ? "text-white" : "text-heading"}`}>
                        {t}
                    </span>
                );
            })}
        </>
    );
}

// ─── Empty / paused states ───────────────────────────────────────────────────
function CenterCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <div className="flex h-full min-h-[360px] items-center justify-center p-6">
            <div className="flex max-w-md flex-col items-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">{icon}</span>
                <h2 className="text-[17px] font-semibold text-heading">{title}</h2>
                <p className="text-[13.5px] leading-relaxed text-subtle">{text}</p>
            </div>
        </div>
    );
}

function ExamLockCard() {
    return (
        <div className="flex h-full min-h-[360px] items-center justify-center p-6">
            <div className="flex w-full max-w-lg items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Lock size={22} />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[16px] font-bold text-heading">Chat is paused during your assessment</span>
                    <span className="text-[13.5px] leading-relaxed text-body">
                        An assessment is in progress. Chat comes back as soon as you submit.
                    </span>
                </span>
            </div>
        </div>
    );
}

// ─── Conversation list ───────────────────────────────────────────────────────
function ThreadRow({ thread, active, onOpen }: { thread: ChatThread; active: boolean; onOpen: () => void }) {
    const preview = thread.lastMessage
        ? `${thread.lastMessage.mine ? "You: " : ""}${thread.lastMessage.text.replace(/```/g, "").replace(/\s+/g, " ").trim()}`
        : thread.kind === "group" ? thread.subtitle : "No messages yet";
    return (
        <button
            type="button"
            onClick={onOpen}
            aria-current={active ? "true" : undefined}
            className={`flex w-full items-start gap-3 border-b border-ink-100 px-4 py-3 text-left transition-colors ${
                active ? "bg-brand-50 shadow-[inset_3px_0_0_var(--color-brand-500)]" : "hover:bg-row-hover"
            }`}
        >
            <Avatar thread={thread} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-heading">{thread.title}</span>
                    {thread.kind === "group" && thread.trainerOnly && (
                        <span className="flex-shrink-0 rounded-md bg-info-50 px-1.5 py-px text-[10.5px] font-semibold text-info-700">
                            Announcements
                        </span>
                    )}
                    <span className="ml-auto flex-shrink-0 text-[11px] text-subtle">{listTime(thread.lastAt)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className={`min-w-0 flex-1 truncate text-[12.5px] ${thread.unread ? "font-medium text-body" : "text-subtle"}`}>
                        {preview}
                    </span>
                    <UnreadBadge n={thread.unread} />
                </span>
                {thread.kind === "direct" && (
                    <span className="truncate text-[11px] text-faint">{thread.subtitle}</span>
                )}
            </span>
        </button>
    );
}

// ─── One conversation ────────────────────────────────────────────────────────
function ThreadView({
    thread,
    role,
    onBack,
    onLocked,
}: {
    thread: ChatThread;
    role: "student" | "trainer";
    onBack: () => void;
    onLocked: () => void;
}) {
    const queryClient = useQueryClient();
    const me = getUserId() || "";
    // A contact nobody has messaged yet has no conversation; the first send
    // opens one.
    const [conversationId, setConversationId] = useState<string | null>(thread.id);
    useEffect(() => setConversationId(thread.id), [thread.key, thread.id]);

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

    // Stay at the bottom as messages arrive; loading earlier keeps the place.
    const scrollRef = useRef<HTMLDivElement>(null);
    const keepOffset = useRef<number | null>(null);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (keepOffset.current !== null) {
            el.scrollTop = el.scrollHeight - keepOffset.current;
            keepOffset.current = null;
        } else {
            el.scrollTop = el.scrollHeight;
        }
    }, [count, conversationId]);

    const [loadingEarlier, setLoadingEarlier] = useState(false);
    const loadEarlier = async () => {
        if (!conversationId || !page?.messages.length) return;
        setLoadingEarlier(true);
        try {
            const older = await fetchChatMessages(conversationId, page.messages[0].at);
            keepOffset.current = scrollRef.current ? scrollRef.current.scrollHeight - scrollRef.current.scrollTop : null;
            queryClient.setQueryData<ChatPage>(chatKeys.messages(conversationId), (p) =>
                p ? { ...p, hasMore: older.hasMore, messages: [...older.messages.filter((m) => !p.messages.some((x) => x.id === m.id)), ...p.messages] } : p);
        } catch (e) {
            toast.error(chatError(e).message);
        } finally {
            setLoadingEarlier(false);
        }
    };

    // ── Composer ──
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        setText("");
    }, [thread.key]);
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [text]);

    const canPost = page ? page.canPost : thread.canPost;

    const send = async () => {
        const body = text.replace(/\s+$/, "");
        if (!body.trim() || sending) return;
        setSending(true);
        try {
            let id = conversationId;
            if (!id) {
                id = await openChat(thread);
                queryClient.setQueryData<ChatPage>(chatKeys.messages(id), { messages: [], hasMore: false, peerReadAt: null, canPost: thread.canPost });
                setConversationId(id);
            }
            const message = await sendChatMessage(id, body);
            queryClient.setQueryData<ChatPage>(chatKeys.messages(id), (p) => appendToThread(p, message));
            setText("");
            queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
        } catch (e) {
            const err = chatError(e);
            if (err.status === 423) onLocked();
            else toast.error(err.message);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const addCode = () => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? text.length;
        const end = el?.selectionEnd ?? text.length;
        const picked = text.slice(start, end);
        const before = text.slice(0, start);
        const lead = before && !before.endsWith("\n") ? "\n" : "";
        const block = `${lead}\`\`\`\n${picked || ""}\n\`\`\`\n`;
        const next = before + block + text.slice(end);
        setText(next);
        requestAnimationFrame(() => {
            if (!el) return;
            const caret = before.length + lead.length + 4 + picked.length;
            el.focus();
            el.setSelectionRange(caret, caret);
        });
    };

    const messages = page?.messages || [];
    const peerReadAt = page?.peerReadAt ? new Date(page.peerReadAt).getTime() : 0;
    // Seen sits under my latest message only, like most chats.
    const lastMine = [...messages].reverse().find((m) => m.mine);

    return (
        <section aria-label={`Chat with ${thread.title}`} className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-ink-200 px-4 py-3 sm:px-5">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to chats"
                    className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-subtle hover:bg-row-hover md:hidden"
                >
                    <ArrowLeft size={18} />
                </button>
                <Avatar thread={thread} />
                <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-heading">{thread.title}</span>
                        {thread.kind === "group" && thread.trainerOnly && (
                            <span className="rounded-md bg-info-50 px-1.5 py-px text-[10.5px] font-semibold text-info-700">Announcements</span>
                        )}
                    </span>
                    <span className="truncate text-[12px] text-subtle">
                        {thread.kind === "group" ? `${thread.subtitle} · ${thread.courseName}` : `${thread.subtitle} · ${thread.courseName}`}
                    </span>
                </span>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-[#FAFBFC] px-4 py-4 sm:px-5">
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
                    <div className="flex flex-col gap-2.5">
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
                            return (
                                <React.Fragment key={m.id}>
                                    {newDay && (
                                        <div className="my-1 self-center rounded-full bg-[#EEF0F4] px-3 py-0.5 text-[11.5px] font-semibold text-subtle">
                                            {dayLabel(m.at)}
                                        </div>
                                    )}
                                    <div className={`flex max-w-[82%] flex-col gap-1 sm:max-w-[72%] ${m.mine ? "items-end self-end" : "items-start self-start"}`}>
                                        {showSender && (
                                            <span className="flex items-center gap-1.5 px-1 text-[11.5px] font-semibold text-body">
                                                {m.senderName}
                                                {m.fromTrainer && (
                                                    <span className="rounded bg-brand-50 px-1 text-[10px] font-semibold text-brand-700">Trainer</span>
                                                )}
                                            </span>
                                        )}
                                        <div
                                            className={`max-w-full px-3.5 py-2 text-[13.5px] leading-relaxed ${
                                                m.mine
                                                    ? "rounded-[14px_14px_4px_14px] bg-brand-600 text-white"
                                                    : "rounded-[14px_14px_14px_4px] border border-ink-200 bg-white"
                                            }`}
                                        >
                                            <MessageBody text={m.text} mine={m.mine} />
                                        </div>
                                        <span className="flex items-center gap-1 px-1 text-[11px] text-subtle">
                                            {clock(m.at)}
                                            {thread.kind === "direct" && m.mine && m.id === lastMine?.id && (
                                                peerReadAt >= new Date(m.at).getTime() ? (
                                                    <span className="inline-flex items-center gap-0.5 text-info-700"><CheckCheck size={13} /> Seen</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5"><Check size={13} /> Sent</span>
                                                )
                                            )}
                                        </span>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>

            {canPost ? (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send();
                    }}
                    className="flex items-end gap-2 border-t border-ink-200 bg-white px-3 py-3 sm:px-4"
                >
                    <button
                        type="button"
                        onClick={addCode}
                        aria-label="Add code"
                        title="Add code"
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] border border-ink-200 bg-white text-body hover:bg-row-hover"
                    >
                        <Code2 size={18} />
                    </button>
                    <label className="min-w-0 flex-1">
                        <span className="sr-only">Message</span>
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={text}
                            maxLength={MAX_TEXT}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                // Enter sends; Shift+Enter (and Enter inside a code fence) is a new line.
                                if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                                const openFences = (text.slice(0, e.currentTarget.selectionStart).match(/```/g) || []).length;
                                if (openFences % 2 === 1) return;
                                e.preventDefault();
                                send();
                            }}
                            placeholder={role === "student" ? "Type your doubt…" : "Type a message…"}
                            className="block min-h-11 w-full resize-none rounded-[10px] border border-ink-200 px-3 py-2.5 text-[13.5px] text-heading outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        />
                        {text.length > MAX_TEXT - 500 && (
                            <span className="mt-1 block text-right text-[11px] text-subtle">{text.length} / {MAX_TEXT}</span>
                        )}
                    </label>
                    <button
                        type="submit"
                        disabled={!text.trim() || sending}
                        className="inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-[10px] bg-gradient-to-b from-brand-400 to-brand-600 px-4 text-[13.5px] font-semibold text-white shadow-[0_4px_12px_rgba(240,112,31,0.28)] transition-all hover:brightness-105 disabled:opacity-50"
                    >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        <span className="max-sm:hidden">Send</span>
                    </button>
                </form>
            ) : (
                <div className="flex items-center gap-2 border-t border-ink-200 bg-white px-4 py-3.5 text-[13px] text-subtle">
                    <Megaphone size={16} className="flex-shrink-0" />
                    Only trainers can post in this group.
                </div>
            )}
        </section>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
    const queryClient = useQueryClient();
    const [lockedLocally, setLockedLocally] = useState(false);
    const { data: inbox, isLoading, isError, error, refetch } = useQuery({
        queryKey: chatKeys.inbox,
        queryFn: fetchChatInbox,
        staleTime: 15_000,
        refetchOnMount: true,
        // The socket drives updates; this only lifts an exam lock and catches
        // anything missed while offline.
        refetchInterval: (q) => (q.state.data?.examLock || lockedLocally ? 20_000 : 60_000),
    });
    useChatLive();

    const examLock = Boolean(inbox?.examLock) || lockedLocally;
    useEffect(() => {
        if (inbox && !inbox.examLock) setLockedLocally(false);
    }, [inbox]);

    const role = inbox?.role || "student";
    const threads = useMemo(() => inbox?.threads || [], [inbox]);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    // Groups first, then the most recent conversations, then everyone else
    // by name — inside each course.
    const sections = useMemo(() => {
        const q = search.trim().toLowerCase();
        const pool = threads.filter((t) =>
            (!q || t.title.toLowerCase().includes(q) || (t.email || "").toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q)) &&
            (filter === "all" || t.unread > 0));
        const byCourse = new Map<string, { name: string; items: ChatThread[] }>();
        pool.forEach((t) => {
            const s = byCourse.get(t.courseId) || { name: t.courseName, items: [] };
            s.items.push(t);
            byCourse.set(t.courseId, s);
        });
        return [...byCourse.values()].map((s) => ({
            ...s,
            items: [...s.items].sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === "group" ? -1 : 1;
                const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
                const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
                if (ta !== tb) return tb - ta;
                return a.title.localeCompare(b.title);
            }),
        }));
    }, [threads, search, filter]);

    const selected = threads.find((t) => t.key === selectedKey) || null;
    // Desktop opens the first chat; a phone starts on the list.
    useEffect(() => {
        if (selectedKey || !threads.length) return;
        if (typeof window !== "undefined" && window.innerWidth >= 768) setSelectedKey(sections[0]?.items[0]?.key || null);
    }, [threads, sections, selectedKey]);

    const unreadTotal = threads.reduce((n, t) => n + t.unread, 0);

    // The chat box fills what the shell leaves below it — the student, staff
    // and admin panels differ in header and padding, so it is measured rather
    // than guessed: down to the bottom of the panel's scroll area.
    const boxRef = useRef<HTMLDivElement>(null);
    const [boxHeight, setBoxHeight] = useState<number | null>(null);
    useLayoutEffect(() => {
        const fit = () => {
            const el = boxRef.current;
            if (!el) return;
            let scroller: HTMLElement | null = el.parentElement;
            while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
            const rect = el.getBoundingClientRect();
            // Rects are in zoomed pixels (the app zooms <html> on some screens),
            // the height we set is not — convert through the element's own ratio.
            const ratio = el.offsetHeight ? rect.height / el.offsetHeight : 1;
            const bottom = scroller
                ? scroller.getBoundingClientRect().bottom - parseFloat(getComputedStyle(scroller).paddingBottom || "0") * ratio
                : window.innerHeight - 16;
            setBoxHeight(Math.max(460, Math.floor((bottom - rect.top) / (ratio || 1))));
        };
        fit();
        // Again once the shell's slide-in has settled (it shifts the top).
        const settle = window.setTimeout(fit, 500);
        window.addEventListener("resize", fit);
        return () => {
            window.clearTimeout(settle);
            window.removeEventListener("resize", fit);
        };
    }, []);

    let body: React.ReactNode;
    if (isLoading) {
        body = (
            <div className="flex h-full min-h-[360px] items-center justify-center text-subtle">
                <Loader2 size={22} className="animate-spin" />
            </div>
        );
    } else if (isError && !inbox) {
        body = (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-[13.5px] text-subtle">
                {chatError(error).message}
                <button type="button" onClick={() => refetch()} className="h-9 rounded-[10px] border border-ink-200 bg-white px-4 text-[12.5px] font-semibold text-body hover:bg-row-hover">
                    Try again
                </button>
            </div>
        );
    } else if (examLock && role === "student") {
        body = <ExamLockCard />;
    } else if (!threads.length) {
        body = (
            <CenterCard
                icon={<MessageSquare size={24} />}
                title="No chats yet"
                text={role === "student"
                    ? "Chat opens here when your course turns it on. You can then message your batch's trainers and read your batch group."
                    : "Chat opens here for courses where Course Setup turns it on and you are in a batch. You can then message your batch's students and post in the batch group."}
            />
        );
    } else {
        body = (
            <div className="flex h-full min-h-0">
                <section
                    aria-label="Chats"
                    className={`min-h-0 w-full flex-col border-r border-ink-200 md:flex md:w-[320px] md:flex-shrink-0 lg:w-[340px] ${selected ? "hidden" : "flex"}`}
                >
                    <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[20px] font-bold text-heading">Messages</h1>
                            <UnreadBadge n={unreadTotal} />
                        </div>
                        <label className="flex h-10 items-center gap-2 rounded-[10px] border border-ink-200 px-3 text-subtle focus-within:border-brand-400">
                            <Search size={15} className="flex-shrink-0" />
                            <span className="sr-only">Search chats</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={role === "student" ? "Search chats" : "Search students"}
                                className="min-w-0 flex-1 bg-transparent text-[13px] text-heading outline-none"
                            />
                        </label>
                        <div className="flex gap-1.5" role="group" aria-label="Show">
                            {(["all", "unread"] as const).map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    aria-pressed={filter === f}
                                    onClick={() => setFilter(f)}
                                    className={`h-8 rounded-full px-3 text-[12px] font-semibold transition-colors ${
                                        filter === f ? "bg-heading text-white" : "border border-ink-200 bg-white text-body hover:bg-row-hover"
                                    }`}
                                >
                                    {f === "all" ? "All" : `Unread${unreadTotal ? ` (${unreadTotal})` : ""}`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {sections.length === 0 && (
                            <p className="px-4 py-8 text-center text-[12.5px] text-subtle">
                                {filter === "unread" ? "No unread messages." : "No chats match your search."}
                            </p>
                        )}
                        {sections.map((s) => (
                            <div key={s.name}>
                                <div className="px-4 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">{s.name}</div>
                                {s.items.map((t) => (
                                    <ThreadRow key={t.key} thread={t} active={t.key === selectedKey} onOpen={() => setSelectedKey(t.key)} />
                                ))}
                            </div>
                        ))}
                        <p className="px-4 py-4 text-[11.5px] leading-relaxed text-faint">
                            {role === "student"
                                ? "You can chat with your batch's trainers and your batch group."
                                : "You can chat with the students of your batches and post in each batch group."}
                        </p>
                    </div>
                </section>

                {selected ? (
                    <ThreadView
                        key={selected.key}
                        thread={selected}
                        role={role}
                        onBack={() => setSelectedKey(null)}
                        onLocked={() => {
                            setLockedLocally(true);
                            queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
                        }}
                    />
                ) : (
                    <div className="hidden min-w-0 flex-1 items-center justify-center bg-[#FAFBFC] text-[13px] text-subtle md:flex">
                        Pick a chat to start.
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            ref={boxRef}
            style={boxHeight ? { height: boxHeight } : undefined}
            className={`overflow-hidden rounded-[18px] border border-ink-200 bg-white ${boxHeight ? "" : "h-[calc(100dvh-8rem)]"}`}
        >
            {body}
        </div>
    );
}
