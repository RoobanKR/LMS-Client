"use client";

// Messages — trainer ↔ student chat and one group per batch, for every course
// whose Course Setup turned Chat on. The server decides who may talk to whom
// (batch roster); this page lists what it returns and talks over the shared
// socket for live updates. The conversation itself is ThreadView.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Lock, MessageSquare, Search, X } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chatError, chatKeys, fetchChatInbox, type ChatThread } from "./api/peopleChat";
import { useChatLive } from "./useChatLive";
import { Avatar, UnreadBadge } from "./chatUi";
import ThreadView from "./ThreadView";

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
// Compact rows in the Teams manner: initials, the name, an unread count. The
// last message rides in the tooltip instead of a second line.
function ThreadRow({
    thread,
    active,
    showCourse,
    onOpen,
}: {
    thread: ChatThread;
    active: boolean;
    showCourse: boolean;
    onOpen: () => void;
}) {
    const preview = thread.lastMessage
        ? `${thread.lastMessage.mine ? "You: " : ""}${thread.lastMessage.text.replace(/```/g, "").replace(/\s+/g, " ").trim()}`
        : "";
    const tip = [thread.title, thread.kind === "group" && thread.trainerOnly ? "Announcements" : thread.subtitle, thread.courseName, preview]
        .filter(Boolean)
        .join(" · ");
    return (
        <button
            type="button"
            onClick={onOpen}
            title={tip}
            aria-current={active ? "true" : undefined}
            className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                active ? "bg-white shadow-xs ring-1 ring-ink-200" : "hover:bg-white/70"
            }`}
        >
            <Avatar thread={thread} size={32} />
            <span className="min-w-0 flex-1">
                <span className={`block truncate text-[14px] ${thread.unread ? "font-semibold text-heading" : "text-body"}`}>
                    {thread.title}
                </span>
                {showCourse && <span className="block truncate text-[11px] text-faint">{thread.courseName}</span>}
            </span>
            <UnreadBadge n={thread.unread} />
        </button>
    );
}

function ListSection({
    label,
    count,
    open,
    onToggle,
    children,
}: {
    label: string;
    count: number;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="pb-1">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-[13.5px] text-body hover:bg-white/70"
            >
                <ChevronDown size={15} className={`flex-shrink-0 text-subtle transition-transform ${open ? "" : "-rotate-90"}`} />
                {label}
                <span className="text-[12px] text-faint">{count}</span>
            </button>
            {open && <div className="flex flex-col gap-0.5">{children}</div>}
        </div>
    );
}

const FILTER_CHIPS = [
    { id: "unread", label: "Unread" },
    { id: "groups", label: "Groups" },
    { id: "chats", label: "Chats" },
] as const;
type ChipId = (typeof FILTER_CHIPS)[number]["id"];
type SectionId = "groups" | "chats" | "people" | "classmates";

// Which sections a viewer folded — a per-browser convenience only.
const FOLD_KEY = "messages.sections";
const readFolds = (): Record<string, boolean> => {
    try {
        return JSON.parse(localStorage.getItem(FOLD_KEY) || "{}") || {};
    } catch {
        return {};
    }
};

// ─── Page ────────────────────────────────────────────────────────────────────
// With `courseId` it is one course's chats, filling the course view's Chat
// dialog (which `onClose` closes); without, every course, in a page shell.
export default function MessagesPage({ courseId: fixedCourse, onClose }: { courseId?: string; onClose?: () => void } = {}) {
    const embedded = Boolean(fixedCourse);
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
    const threads = useMemo(
        () => (inbox?.threads || []).filter((t) => !fixedCourse || t.courseId === fixedCourse),
        [inbox, fixedCourse],
    );

    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [chip, setChip] = useState<ChipId | null>(null);
    const [courseId, setCourseId] = useState<string | null>(null);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [folds, setFolds] = useState<Record<string, boolean>>({});
    useEffect(() => setFolds(readFolds()), []);

    const courses = useMemo(() => {
        const m = new Map<string, string>();
        threads.forEach((t) => m.set(t.courseId, t.courseName));
        return [...m.entries()].map(([id, name]) => ({ id, name }));
    }, [threads]);
    const multiCourse = courses.length > 1;
    const peopleLabel = role === "student" ? "Trainers" : "Students";
    // A student's batch-mates (Course Setup ▸ Student ↔ Student) list apart
    // from their trainers.
    const isClassmate = (t: ChatThread) => role === "student" && t.peerRole === "student";
    const hasClassmates = threads.some(isClassmate);

    // Groups (one per batch), Chats (people you have talked to, latest first)
    // and everyone else you may message, by name.
    const lists = useMemo(() => {
        const q = search.trim().toLowerCase();
        const pool = threads.filter((t) =>
            (!courseId || t.courseId === courseId) &&
            (!q || [t.title, t.email || "", t.subtitle, t.courseName].some((v) => v.toLowerCase().includes(q))) &&
            (chip !== "unread" || t.unread > 0));
        const at = (t: ChatThread) => (t.lastAt ? new Date(t.lastAt).getTime() : 0);
        const byRecent = (a: ChatThread, b: ChatThread) => at(b) - at(a) || a.title.localeCompare(b.title);
        const byName = (a: ChatThread, b: ChatThread) => a.title.localeCompare(b.title);
        const fresh = chip === "groups" ? [] : pool.filter((t) => t.kind === "direct" && !t.lastAt);
        return {
            groups: chip === "chats" ? [] : pool.filter((t) => t.kind === "group").sort(byRecent),
            chats: chip === "groups" ? [] : pool.filter((t) => t.kind === "direct" && t.lastAt).sort(byRecent),
            people: fresh.filter((t) => !isClassmate(t)).sort(byName),
            classmates: fresh.filter(isClassmate).sort(byName),
        };
        // isClassmate reads role only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threads, search, chip, courseId, role]);
    const ordered = useMemo(() => [...lists.groups, ...lists.chats, ...lists.people, ...lists.classmates], [lists]);

    // A long roster starts folded; a search opens everything it matched.
    const isOpen = (id: SectionId, count: number) =>
        search.trim() ? true : folds[id] ?? !((id === "people" || id === "classmates") && count > 12);
    const toggleFold = (id: SectionId, count: number) => {
        const next = { ...folds, [id]: !isOpen(id, count) };
        setFolds(next);
        try {
            localStorage.setItem(FOLD_KEY, JSON.stringify(next));
        } catch {
            // Folding just won't be remembered.
        }
    };

    const selected = threads.find((t) => t.key === selectedKey) || null;
    // Desktop opens the first chat; a phone starts on the list.
    useEffect(() => {
        if (selectedKey || !threads.length) return;
        if (typeof window !== "undefined" && window.innerWidth >= 768) setSelectedKey(ordered[0]?.key || null);
    }, [threads, ordered, selectedKey]);

    const unreadTotal = threads.reduce((n, t) => n + t.unread, 0);

    // The chat box fills what the shell leaves below it — the student, staff
    // and admin panels differ in header and padding, so it is measured rather
    // than guessed: down to the bottom of the panel's scroll area, less every
    // bottom padding/border between the box and that area.
    const boxRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLElement | null>(null);
    const [boxHeight, setBoxHeight] = useState<number | null>(null);
    useLayoutEffect(() => {
        // In the course dialog the dialog sets the height.
        if (embedded) return;
        const fit = () => {
            const el = boxRef.current;
            if (!el) return;
            let scroller: HTMLElement | null = el.parentElement;
            let below = 0;
            while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
                const cs = getComputedStyle(scroller);
                below += parseFloat(cs.paddingBottom || "0") + parseFloat(cs.borderBottomWidth || "0");
                scroller = scroller.parentElement;
            }
            scrollerRef.current = scroller;
            if (scroller) below += parseFloat(getComputedStyle(scroller).paddingBottom || "0");
            const rect = el.getBoundingClientRect();
            // Rects are in zoomed pixels (the app zooms <html> on some screens),
            // the height we set is not — convert through the element's own ratio.
            const ratio = el.offsetHeight ? rect.height / el.offsetHeight : 1;
            const bottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight - 16;
            setBoxHeight(Math.max(460, Math.floor((bottom - rect.top) / (ratio || 1) - below)));
        };
        fit();
        // Again once the shell's slide-in has settled (it shifts the top).
        const settle = window.setTimeout(fit, 500);
        window.addEventListener("resize", fit);
        return () => {
            window.clearTimeout(settle);
            window.removeEventListener("resize", fit);
        };
    }, [embedded]);
    // Whatever the estimate missed, the panel's own overflow says exactly: take
    // it off so the panel never scrolls.
    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (!boxHeight || !scroller) return;
        const over = scroller.scrollHeight - scroller.clientHeight;
        if (over > 0 && boxHeight - over >= 460) setBoxHeight(boxHeight - over);
    }, [boxHeight]);

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
                    className={`min-h-0 w-full flex-col border-r border-ink-200 bg-surface-sunken md:flex md:w-[300px] md:flex-shrink-0 lg:w-[320px] ${selected ? "hidden" : "flex"}`}
                >
                    <div className={`flex items-center gap-2 px-4 pb-2 pt-4 ${onClose ? "max-md:pr-14" : ""}`}>
                        <h1 className="text-[20px] font-bold text-heading">{embedded ? "Chat" : "Messages"}</h1>
                        <UnreadBadge n={unreadTotal} />
                        <button
                            type="button"
                            onClick={() => {
                                if (searchOpen) setSearch("");
                                setSearchOpen(!searchOpen);
                            }}
                            aria-label={searchOpen ? "Close search" : "Search"}
                            aria-pressed={searchOpen}
                            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-body hover:bg-white"
                        >
                            {searchOpen ? <X size={18} /> : <Search size={18} />}
                        </button>
                    </div>
                    {searchOpen && (
                        <div className="px-4 pb-2">
                            <label className="flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-subtle focus-within:border-brand-400">
                                <Search size={14} className="flex-shrink-0" />
                                <span className="sr-only">Search chats</span>
                                <input
                                    autoFocus
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={role !== "student" ? "Search students and groups" : hasClassmates ? "Search trainers, classmates, groups" : "Search trainers and groups"}
                                    className="min-w-0 flex-1 bg-transparent text-[13px] text-heading outline-none"
                                />
                            </label>
                        </div>
                    )}
                    <div className={`flex items-center gap-1.5 px-4 ${courseId ? "pb-2" : "border-b border-ink-200 pb-3"}`} role="group" aria-label="Show">
                        {FILTER_CHIPS.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                aria-pressed={chip === c.id}
                                onClick={() => setChip((cur) => (cur === c.id ? null : c.id))}
                                className={`h-8 flex-shrink-0 whitespace-nowrap rounded-full border px-3 text-[12.5px] transition-colors ${
                                    chip === c.id
                                        ? "border-heading bg-heading font-semibold text-white"
                                        : "border-ink-300 bg-transparent text-body hover:bg-white"
                                }`}
                            >
                                {c.id === "unread" && unreadTotal ? `Unread (${unreadTotal})` : c.label}
                            </button>
                        ))}
                        {multiCourse && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Filter by course"
                                        className={`ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                                            courseId ? "bg-heading text-white" : "text-body hover:bg-white"
                                        }`}
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[200px]">
                                    <DropdownMenuItem onSelect={() => setCourseId(null)}>
                                        <Check size={14} className={courseId ? "opacity-0" : ""} /> All courses
                                    </DropdownMenuItem>
                                    {courses.map((c) => (
                                        <DropdownMenuItem key={c.id} onSelect={() => setCourseId(c.id)}>
                                            <Check size={14} className={courseId === c.id ? "" : "opacity-0"} /> {c.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    {courseId && (
                        <div className="flex items-center gap-1.5 border-b border-ink-200 px-4 pb-3 text-[12px] text-subtle">
                            Course:
                            <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white py-0.5 pl-2.5 pr-1 font-semibold text-heading ring-1 ring-ink-200">
                                <span className="truncate">{courses.find((c) => c.id === courseId)?.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setCourseId(null)}
                                    aria-label="Show all courses"
                                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-subtle hover:bg-row-hover"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto py-2">
                        {!ordered.length && (
                            <p className="px-4 py-8 text-center text-[12.5px] text-subtle">
                                {search.trim()
                                    ? "Nothing matches your search."
                                    : chip === "unread" ? "No unread messages." : chip === "groups" ? "No groups." : "No chats yet."}
                            </p>
                        )}
                        {([
                            { id: "groups", label: "Groups", items: lists.groups },
                            { id: "chats", label: "Chats", items: lists.chats },
                            { id: "people", label: peopleLabel, items: lists.people },
                            { id: "classmates", label: "Classmates", items: lists.classmates },
                        ] as const).map((sec) =>
                            sec.items.length ? (
                                <ListSection
                                    key={sec.id}
                                    label={sec.label}
                                    count={sec.items.length}
                                    open={isOpen(sec.id, sec.items.length)}
                                    onToggle={() => toggleFold(sec.id, sec.items.length)}
                                >
                                    {sec.items.map((t) => (
                                        <ThreadRow
                                            key={t.key}
                                            thread={t}
                                            active={t.key === selectedKey}
                                            showCourse={multiCourse && !courseId}
                                            onOpen={() => setSelectedKey(t.key)}
                                        />
                                    ))}
                                </ListSection>
                            ) : null,
                        )}
                        <p className="px-4 pb-2 pt-3 text-[11.5px] leading-relaxed text-faint">
                            {role !== "student"
                                ? "You can chat with the students of your batches and post in each batch group."
                                : hasClassmates
                                    ? "You can chat with your batch's trainers, your classmates and your batch group."
                                    : "You can chat with your batch's trainers and your batch group."}
                        </p>
                    </div>
                </section>

                {selected ? (
                    <ThreadView
                        key={selected.key}
                        thread={selected}
                        role={role}
                        onBack={() => setSelectedKey(null)}
                        inDialog={Boolean(onClose)}
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

    if (embedded) {
        return (
            <div className="relative h-full min-h-0 overflow-hidden bg-white">
                {body}
                {onClose && (
                    // Over the conversation header's right end, clear of its text.
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close chat"
                        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-body hover:bg-row-hover"
                    >
                        <X size={18} />
                    </button>
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
