"use client";

// The course view's Chat button, beside Notes. It shows once this course has
// chat for the viewer (Course Setup ▸ Chat, and a batch of theirs), carries
// the course's unread count, and opens the course's chats in a large dialog.
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatsCircle } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getToken } from "@/lib/session";
import { chatKeys, fetchChatInbox } from "./api/peopleChat";
import { useChatLive } from "./useChatLive";
import MessagesPage from "./MessagesPage";

export default function CourseChatButton({ courseId }: { courseId: string }) {
    const [open, setOpen] = useState(false);
    const { data: inbox } = useQuery({
        queryKey: chatKeys.inbox,
        queryFn: fetchChatInbox,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        enabled: typeof window !== "undefined" && !!getToken() && !!courseId,
    });
    useChatLive();

    const threads = (inbox?.threads || []).filter((t) => t.courseId === courseId);
    if (!threads.length) return null;
    const unread = threads.reduce((n, t) => n + t.unread, 0);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title={unread ? `Chat · ${unread} unread` : "Chat with your trainers and batch"}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-[12.5px] font-semibold leading-none text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100"
                style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" }}
            >
                <ChatsCircle size={15} weight="bold" />
                Chat
                {unread > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10.5px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    showCloseButton={false}
                    aria-describedby={undefined}
                    className="h-[88dvh] max-w-[1180px] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[1180px] max-lg:overflow-hidden"
                >
                    <DialogTitle className="sr-only">Course chat</DialogTitle>
                    {open && <MessagesPage courseId={courseId} onClose={() => setOpen(false)} />}
                </DialogContent>
            </Dialog>
        </>
    );
}
