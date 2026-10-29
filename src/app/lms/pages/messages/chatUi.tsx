"use client";

// Small pieces the chat list and the conversation share: time labels,
// avatars, message text (code fences, links, @mentions) and file cards.
import React from "react";
import {
    Download, File as FileIcon, FileArchive, FileCode2, FileImage, FileSpreadsheet, FileText, Megaphone, Users,
} from "lucide-react";
import type { ChatAttachment, ChatThread } from "./api/peopleChat";

// ─── Time labels ─────────────────────────────────────────────────────────────
export const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.round((dayStart(new Date()) - dayStart(d)) / 86_400_000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

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

// "Chitra Palanimuthu" → CP, "HARINI E" → HE, "Surya" → SU.
export const initialsOf = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
};

export function PersonAvatar({ seed, name, online, size = 32 }: { seed: string; name: string; online?: boolean; size?: number }) {
    return (
        <span
            className={`relative flex flex-shrink-0 items-center justify-center rounded-full font-semibold ${toneOf(seed || name)}`}
            style={{ width: size, height: size, fontSize: size * 0.34 }}
            aria-hidden="true"
        >
            {initialsOf(name)}
            {online && <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
        </span>
    );
}

export function Avatar({ thread, size = 40 }: { thread: ChatThread; size?: number }) {
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
    return <PersonAvatar seed={thread.peerId || thread.title} name={thread.title} online={thread.online} size={size} />;
}

export function UnreadBadge({ n }: { n: number }) {
    if (!n) return null;
    return (
        <span className="inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
            {n > 99 ? "99+" : n}
        </span>
    );
}

// ─── Message text ────────────────────────────────────────────────────────────
// ``` fences become code blocks; outside them links open in a new tab and an
// @mention of someone the message names is marked.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const URL_SRC = "https?:\\/\\/[^\\s<>\"'`)\\]]+";

function Inline({ text, mine, mentions }: { text: string; mine: boolean; mentions?: { name: string }[] }) {
    const names = (mentions || []).map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
    const re = new RegExp(`(${[URL_SRC, ...names.map((n) => `@${escapeRe(n)}`)].join("|")})`, "g");
    const pieces = text.split(re);
    return (
        <>
            {pieces.map((p, i) => {
                // One capture group: matches sit at the odd indexes.
                if (i % 2 === 0) return p;
                if (p.startsWith("@")) {
                    return (
                        <span key={i} className={mine ? "font-semibold underline decoration-white/60" : "rounded bg-brand-50 px-0.5 font-semibold text-brand-700"}>
                            {p}
                        </span>
                    );
                }
                const url = p.replace(/[.,;:!?]+$/, "");
                return (
                    <React.Fragment key={i}>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`break-all underline ${mine ? "text-white" : "text-info-700"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {url}
                        </a>
                        {p.slice(url.length)}
                    </React.Fragment>
                );
            })}
        </>
    );
}

export function MessageBody({ text, mine, mentions }: { text: string; mine: boolean; mentions?: { name: string }[] }) {
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
                        <Inline text={t} mine={mine} mentions={mentions} />
                    </span>
                );
            })}
        </>
    );
}

// ─── Files ───────────────────────────────────────────────────────────────────
export const fileSize = (n: number) => {
    if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
export const extOf = (name: string) => (name.includes(".") ? name.split(".").pop() || "" : "").toLowerCase();
export const isImage = (f: { name: string; mime?: string }) =>
    (f.mime || "").startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(extOf(f.name));

export function FileGlyph({ name, mime, size = 18 }: { name: string; mime?: string; size?: number }) {
    const ext = extOf(name);
    if (isImage({ name, mime })) return <FileImage size={size} className="text-violet-600" />;
    if (ext === "pdf") return <FileText size={size} className="text-red-600" />;
    if (["doc", "docx", "txt", "md", "rtf", "odt"].includes(ext)) return <FileText size={size} className="text-sky-700" />;
    if (["xls", "xlsx", "csv", "ods"].includes(ext)) return <FileSpreadsheet size={size} className="text-emerald-700" />;
    if (["ppt", "pptx", "odp"].includes(ext)) return <FileText size={size} className="text-orange-600" />;
    if (["zip", "rar", "7z"].includes(ext)) return <FileArchive size={size} className="text-amber-700" />;
    if (["java", "py", "c", "cpp", "h", "hpp", "cs", "js", "jsx", "ts", "tsx", "json", "sql", "css", "ipynb", "go", "kt", "rb", "php"].includes(ext)) {
        return <FileCode2 size={size} className="text-slate-700" />;
    }
    return <FileIcon size={size} className="text-subtle" />;
}

export function Attachments({ files, mine }: { files: ChatAttachment[]; mine: boolean }) {
    if (!files.length) return null;
    const images = files.filter(isImage);
    const others = files.filter((f) => !isImage(f));
    return (
        <div className={`flex max-w-full flex-col gap-1.5 ${mine ? "items-end" : "items-start"}`}>
            {images.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 ${mine ? "justify-end" : ""}`}>
                    {images.map((f) => (
                        <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" title={f.name} onClick={(e) => e.stopPropagation()}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt={f.name} loading="lazy" className="max-h-48 max-w-[240px] rounded-xl border border-ink-200 bg-white object-cover" />
                        </a>
                    ))}
                </div>
            )}
            {others.map((f) => (
                <a
                    key={f.url}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex w-[260px] max-w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-3 py-2.5 transition-colors hover:bg-row-hover"
                >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6]">
                        <FileGlyph name={f.name} mime={f.mime} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-heading">{f.name}</span>
                        <span className="block text-[11.5px] text-subtle">
                            {[extOf(f.name).toUpperCase(), fileSize(f.size)].filter(Boolean).join(" · ")}
                        </span>
                    </span>
                    <Download size={15} className="flex-shrink-0 text-subtle" />
                </a>
            ))}
        </div>
    );
}
