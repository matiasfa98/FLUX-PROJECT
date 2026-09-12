// client/src/services/chatApi.js
import { apiRequest } from "../lib/api";

export const fetchInbox = async () => {
  const data = await apiRequest("/chat/inbox");
  return data.conversations || [];
};

export const fetchConversation = async (conversationId) => {
  const data = await apiRequest(`/chat/conversations/${conversationId}`);
  return data.conversation;
};

export const createConversation = async (payload) => {
  const data = await apiRequest("/chat/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.conversation;
};

export const fetchMessages = async (
  conversationId,
  { before, limit = 50 } = {}
) => {
  const params = new URLSearchParams();
  if (before) params.set("before", before);
  params.set("limit", String(limit));

  const data = await apiRequest(
    `/chat/conversations/${conversationId}/messages?${params.toString()}`
  );
  return { messages: data.messages || [], hasMore: Boolean(data.hasMore) };
};

export const markConversationRead = async (conversationId) => {
  return apiRequest(`/chat/conversations/${conversationId}/read`, {
    method: "POST",
  });
};

export const leaveGroup = async (conversationId) => {
  return apiRequest(`/chat/conversations/${conversationId}/leave`, {
    method: "DELETE",
  });
};