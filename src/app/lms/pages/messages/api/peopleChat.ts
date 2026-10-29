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

export type ChatAttachment = { name: string; url: string; size: number; mime: string };

export type ChatMessage = {
    id: string;
    conversationId: string;
    text: string;
    at: string;
    senderId: string;
    senderName: string;
    mine: boolean;
    fromTrainer?: boolean;
    attachments?: ChatAttachment[];
    // A copy of the message answered.
    replyTo?: { id: string; senderName: string; text: string } | null;
    mentions?: { id: string; name: string }[];
    reactions?: { emoji: string; userIds: string[] }[];
    edited?: boolean;
    deleted?: boolean;
};

export type ChatPage = {
    messages: ChatMessage[];
    hasMore: boolean;
    peerReadAt: string | null;
    canPost: boolean;
    // A trainer in a batch group may remove anyone's message.
    canModerate?: boolean;
};

export type ChatMember = { id: string; name: string; role: "trainer" | "student"; online: boolean; me: boolean };

type SharedBase = { messageId: string; at: string; senderName: string };
export type ChatShared = {
    files: (ChatAttachment & SharedBase)[];
    links: ({ url: string } & SharedBase)[];
};

export type ChatNotes = { text: string; updatedAt: string | null; updatedBy: string; canEdit: boolean };

// The reactions the server accepts.
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "✅"] as const;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const chatKeys = {
    all: ["peopleChat"] as const,
    summary: ["peopleChat", "summary"] as const,
    inbox: ["peopleChat", "inbox"] as const,
    messages: (conversationId: string) => ["peopleChat", "messages", conversationId] as const,
    shared: (conversationId: string) => ["peopleChat", "shared", conversationId] as const,
    notes: (conversationId: string) => ["peopleChat", "notes", conversationId] as const,
    members: (conversationId: string) => ["peopleChat", "members", conversationId] as const,
    search: (conversationId: string, q: string) => ["peopleChat", "search", conversationId, q] as const,
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

export const sendChatMessage = async (
    conversationId: string,
    body: { text: string; attachments?: ChatAttachment[]; replyTo?: string; mentions?: string[] },
): Promise<ChatMessage> =>
    (await http.post(`/people-chat/conversations/${conversationId}/messages`, body)).data.message;

export const searchChatMessages = async (conversationId: string, q: string): Promise<ChatMessage[]> =>
    (await http.get(`/people-chat/conversations/${conversationId}/messages`, { params: { q } })).data.messages;

export const uploadChatFile = async (conversationId: string, file: File, onProgress?: (pct: number) => void): Promise<ChatAttachment> => {
    const form = new FormData();
    form.append("file", file);
    const res = await http.post(`/people-chat/conversations/${conversationId}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    });
    return res.data.attachment;
};

export const editChatMessage = async (messageId: string, text: string): Promise<ChatMessage> =>
    (await http.patch(`/people-chat/messages/${messageId}`, { text })).data.message;

export const deleteChatMessage = async (messageId: string): Promise<ChatMessage> =>
    (await http.delete(`/people-chat/messages/${messageId}`)).data.message;

export const reactChatMessage = async (messageId: string, emoji: string): Promise<ChatMessage> =>
    (await http.post(`/people-chat/messages/${messageId}/reactions`, { emoji })).data.message;

export const fetchChatShared = async (conversationId: string): Promise<ChatShared> => {
    const { files, links } = (await http.get(`/people-chat/conversations/${conversationId}/shared`)).data;
    return { files, links };
};

export const fetchChatNotes = async (conversationId: string): Promise<ChatNotes> =>
    (await http.get(`/people-chat/conversations/${conversationId}/notes`)).data.notes;

export const saveChatNotes = async (conversationId: string, text: string): Promise<ChatNotes> =>
    (await http.put(`/people-chat/conversations/${conversationId}/notes`, { text })).data.notes;

export const fetchChatMembers = async (conversationId: string): Promise<ChatMember[]> =>
    (await http.get(`/people-chat/conversations/${conversationId}/members`)).data.members;

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
