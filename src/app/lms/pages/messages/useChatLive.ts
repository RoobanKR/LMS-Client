"use client";

// Real-time side of people chat. The server emits to the user's own room
// (user-<id>, joined on connect): `chat:message` when anything arrives in one
// of their chats, `chat:read` when someone opens one. Both the sidebar badge
// and the Messages page listen here, on the one shared socket.
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/apiServices/socketClient";
import { getToken } from "@/lib/session";
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
                queryClient.setQueryData<ChatPage>(chatKeys.messages(e.conversationId), (page) =>
                    appendToThread(page, e.message as ChatMessage));
            }
            queryClient.invalidateQueries({ queryKey: chatKeys.summary });
            queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
            ref.current?.onMessage?.(e);
        };
        const onRead = (e: ChatReadEvent) => {
            queryClient.invalidateQueries({ queryKey: chatKeys.summary });
            ref.current?.onRead?.(e);
        };

        socket.on("chat:message", onMessage);
        socket.on("chat:read", onRead);
        return () => {
            socket.off("chat:message", onMessage);
            socket.off("chat:read", onRead);
        };
    }, [queryClient]);
}
