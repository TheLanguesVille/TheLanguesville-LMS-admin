import { apiClient, type ApiResult } from "./client";

// Student ↔ staff messaging (`/api/messages`). Plain request/response — the
// UI refetches on navigation, window focus and after sending; never polls.

export interface StudentParticipant {
  id: string | null;
  name: string;
  initials: string;
  avatarUrl: string | null;
  email: string | null;
}

export interface StaffParticipant {
  id: string | null;
  name: string;
  initials: string;
  avatarUrl: string | null;
  role: string;
  roleLabel: string;
}

export interface ConversationSummary {
  id: string;
  student: StudentParticipant;
  staff: StaffParticipant;
  lastMessage: {
    preview: string;
    at: string;
    fromMe: boolean;
    senderType: "student" | "staff";
  };
  unreadCount: number;
  /** False when an admin is reading someone else's thread (read-only). */
  participant: boolean;
}

export interface ChatMessage {
  id: string;
  senderType: "student" | "staff";
  senderId: string;
  subject: string | null;
  body: string;
  mine: boolean;
  createdAt: string;
}

export interface InboxData {
  scope: "mine" | "all";
  canSeeAll: boolean;
  conversations: ConversationSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ThreadData {
  conversation: ConversationSummary;
  messages: ChatMessage[];
  hasMore: boolean;
}

export function listConversations(params: {
  scope?: "mine" | "all";
  search?: string;
}): Promise<ApiResult<InboxData>> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set("scope", params.scope);
  if (params.search) qs.set("search", params.search);
  qs.set("limit", "100");
  return apiClient<InboxData>(`/messages/conversations?${qs.toString()}`);
}

export function getUnreadCount(): Promise<
  ApiResult<{ unread: number; conversations: number }>
> {
  return apiClient(`/messages/unread-count`);
}

export function getThread(
  conversationId: string,
  before?: string,
): Promise<ApiResult<ThreadData>> {
  const qs = new URLSearchParams({ limit: "40" });
  if (before) qs.set("before", before);
  return apiClient<ThreadData>(
    `/messages/conversations/${conversationId}?${qs.toString()}`,
  );
}

export function sendReply(
  conversationId: string,
  body: string,
): Promise<ApiResult<{ conversationId: string; message: ChatMessage }>> {
  return apiClient(`/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function startConversation(
  studentId: string,
  body: string,
): Promise<ApiResult<{ conversationId: string; message: ChatMessage }>> {
  return apiClient(`/messages/conversations`, {
    method: "POST",
    body: JSON.stringify({ studentId, body }),
  });
}

export function listContacts(
  search?: string,
): Promise<ApiResult<{ contacts: StudentParticipant[] }>> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiClient(`/messages/contacts${qs}`);
}

export function lookupStudent(studentId: string): Promise<
  ApiResult<{
    conversationId: string | null;
    participant: StudentParticipant;
    canMessage: boolean;
  }>
> {
  return apiClient(`/messages/contacts/${studentId}`);
}

/**
 * Fired after anything that changes the unread count (opening a thread,
 * sending) so the sidebar badge refreshes without polling.
 */
export const UNREAD_CHANGED_EVENT = "messages:unread-changed";

export function notifyUnreadChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
  }
}
