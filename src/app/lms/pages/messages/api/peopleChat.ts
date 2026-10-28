// People chat — trainer ↔ student and batch groups (server: controllers/peopleChat.js).
// Not the AI chatbot history, which lives under /api/chat.
import { http } from "@/lib/http";

export type ChatThread = {
    // Stable even before the conversation exists (a contact nobody has
    // messaged yet has no id) — the list and the selection key on this.
    key: string;
    id: string | null;
    kind: "direct" | "group";
    courseId: string;
    courseName: string;
    batchId?: string;
    peerId?: string;
    title: string;
    subtitle: string;
    email?: string;
    // Direct chats: the person has the LMS open right now.
    online?: boolean;
    // Direct chats: whether the other person is a trainer or a student
    // (a student's classmate, with Student ↔ Student on).
    peerRole?: "trainer" | "student";
    trainerOnly?: boolean;
    canPost: boolean;
    unread: number;
    lastMessage: { text: string; at: string; mine: boolean } | null;
    lastAt: string | null;
};

export type ChatInbox = {
    role: "student" | "trainer";
    examLock: boolean;
    threads: ChatThread[];
};

export type ChatSummary = {
    enabled: boolean;
    unread: number;
    examLock: boolean;
    role: "student" | "trainer";
};

export type ChatMessage = {
    id: string;
    conversationId: string;
    text: string;
    at: string;
    senderId: string;
    senderName: string;
    mine: boolean;
    fromTrainer?: boolean;
};

export type ChatPage = {
    messages: ChatMessage[];
    hasMore: boolean;
    peerReadAt: string | null;
    canPost: boolean;
};

export const chatKeys = {
    all: ["peopleChat"] as const,
    summary: ["peopleChat", "summary"] as const,
    inbox: ["peopleChat", "inbox"] as const,
    messages: (conversationId: string) => ["peopleChat", "messages", conversationId] as const,
};

export const fetchChatSummary = async (): Promise<ChatSummary> =>
    (await http.get("/people-chat/summary")).data;

export const fetchChatInbox = async (): Promise<ChatInbox> =>
    (await http.get("/people-chat/inbox")).data;

export const openChat = async (thread: ChatThread): Promise<string> => {
    const body = thread.kind === "group"
        ? { courseId: thread.courseId, kind: "group", batchId: thread.batchId }
        : { courseId: thread.courseId, kind: "direct", peerId: thread.peerId };
    return (await http.post("/people-chat/open", body)).data.conversationId;
};

export const fetchChatMessages = async (conversationId: string, before?: string): Promise<ChatPage> =>
    (await http.get(`/people-chat/conversations/${conversationId}/messages`, { params: before ? { before } : {} })).data;

export const sendChatMessage = async (conversationId: string, text: string): Promise<ChatMessage> =>
    (await http.post(`/people-chat/conversations/${conversationId}/messages`, { text })).data.message;

export const markChatRead = async (conversationId: string): Promise<void> => {
    await http.post(`/people-chat/conversations/${conversationId}/read`);
};

/** The server's message for a failed call (423 = exam lock). */
export const chatError = (e: unknown): { status: number; message: string } => {
    const err = e as { response?: { status?: number; data?: { message?: unknown } }; message?: string };
    // The auth middleware answers with [{ key, value }] rather than a string.
    const raw = err?.response?.data?.message;
    const text = Array.isArray(raw)
        ? raw.map((m) => (typeof m === "string" ? m : (m as { value?: string })?.value)).filter(Boolean).join(", ")
        : typeof raw === "string" ? raw : "";
    return {
        status: err?.response?.status || 0,
        message: text || err?.message || "Something went wrong",
    };
};
