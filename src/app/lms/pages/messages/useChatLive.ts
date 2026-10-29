"use client";

// Real-time side of people chat. The server emits to the user's own room
// (user-<id>, joined on connect): `chat:message` when anything arrives in one
// of their chats, `chat:update` when one is edited, deleted or reacted to,
// `chat:read` when someone opens one, `chat:notes` when its notes change. The
// sidebar badge, the course Chat button and the chat itself listen here, on
// the one shared socket.
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/apiServices/socketClient";
import { getToken, getUserId } from "@/lib/session";
import { chatKeys, type ChatMessage, type ChatPage } from "./api/peopleChat";

export type ChatMessageEvent = {
    conversationId: string;
    courseId: string;
    kind: "direct" | "group";
    // null for a student inside an assessment: they hear that something
    // arrived, not what.
    message: ChatMessage | null;
};

export type ChatReadEvent = { conversationId: string; userId: string; at: string };

/** Append one message to an open thread's cache, once. */
export const appendToThread = (page: ChatPage | undefined, message: ChatMessage): ChatPage | undefined => {
    if (!page) return page;
    if (page.messages.some((m) => m.id === message.id)) return page;
    return { ...page, messages: [...page.messages, message] };
};

/** Swap in a message's new state (edited, deleted, reactions). */
export const replaceInThread = (page: ChatPage | undefined, message: ChatMessage): ChatPage | undefined =>
    page ? { ...page, messages: page.messages.map((m) => (m.id === message.id ? message : m)) } : page;

// The server broadcasts one copy to everyone; whose it is is decided here.
const asViewer = (message: ChatMessage): ChatMessage => ({ ...message, mine: message.senderId === getUserId() });

export function useChatLive(handlers?: {
    onMessage?: (e: ChatMessageEvent) => void;
    onRead?: (e: ChatReadEvent) => void;
}) {
    const queryClient = useQueryClient();
    // Latest handlers without re-subscribing on every render.
    const ref = useRef(handlers);
    ref.current = handlers;

    useEffect(() => {
        if (typeof window === "undefined" || !getToken()) return;
        const socket = getSocket();

        const onMessage = (e: ChatMessageEvent) => {
            if (e?.message) {
                const message = asViewer(e.message);
                queryClient.setQueryData<ChatPage>(chatKeys.messages(e.conversationId), (page) => appendToThread(page, message));
                if (message.attachments?.length || /https?:\/\//.test(message.text)) {
                    queryClient.invalidateQueries({ queryKey: chatKeys.shared(e.conversationId) });
                }
            }
            queryClient.invalidateQueries({ queryKey: chatKeys.summary });
            queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
            ref.current?.onMessage?.(e);
        };
        const onUpdate = (e: ChatMessageEvent) => {
            if (!e?.message) return;
            queryClient.setQueryData<ChatPage>(chatKeys.messages(e.conversationId), (page) =>
                replaceInThread(page, asViewer(e.message as ChatMessage)));
            queryClient.invalidateQueries({ queryKey: chatKeys.shared(e.conversationId) });
            queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
        };
        const onNotes = (e: { conversationId: string }) => {
            if (e?.conversationId) queryClient.invalidateQueries({ queryKey: chatKeys.notes(e.conversationId) });
        };
        const onRead = (e: ChatReadEvent) => {
            queryClient.invalidateQueries({ queryKey: chatKeys.summary });
            ref.current?.onRead?.(e);
        };

        socket.on("chat:message", onMessage);
        socket.on("chat:update", onUpdate);
        socket.on("chat:read", onRead);
        socket.on("chat:notes", onNotes);
        return () => {
            socket.off("chat:message", onMessage);
            socket.off("chat:update", onUpdate);
            socket.off("chat:read", onRead);
            socket.off("chat:notes", onNotes);
        };
    }, [queryClient]);
}
