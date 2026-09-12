// mobile/src/store/slices/chatSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  conversations: any[];
  messagesByConversation: Record<string, any[]>;
  activeConversationId: string | null;
  unreadTotal: number;
  loadingInbox: boolean;
}

const initialState: ChatState = {
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  unreadTotal: 0,
  loadingInbox: false,
};

const recalcUnread = (convs: any[]) =>
  convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<any[]>) {
      state.conversations = action.payload || [];
      state.unreadTotal = recalcUnread(state.conversations);
    },
    setLoadingInbox(state, action: PayloadAction<boolean>) {
      state.loadingInbox = action.payload;
    },
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
      if (action.payload) {
        const c = state.conversations.find((x) => x.id === action.payload);
        if (c && c.unreadCount) {
          c.unreadCount = 0;
          state.unreadTotal = recalcUnread(state.conversations);
        }
      }
    },
    setMessages(
      state,
      action: PayloadAction<{ conversationId: string; messages: any[] }>
    ) {
      const { conversationId, messages } = action.payload;
      state.messagesByConversation[conversationId] = messages || [];
    },
    receiveMessage(state, action: PayloadAction<any>) {
      const msg = action.payload;
      if (!msg?.conversationId) return;
      const list = state.messagesByConversation[msg.conversationId] || [];
      if (msg.id && list.some((m) => m.id === msg.id)) return;
      state.messagesByConversation[msg.conversationId] = [...list, msg];

      const c = state.conversations.find((x) => x.id === msg.conversationId);
      if (c) {
        c.lastMessagePreview = msg.text?.slice(0, 80) || "";
        c.lastMessageAt = msg.createdAt || new Date().toISOString();
      }
    },
    upsertConversation(state, action: PayloadAction<any>) {
      const conv = action.payload;
      if (!conv?.id) return;
      const idx = state.conversations.findIndex((c) => c.id === conv.id);
      if (idx >= 0) {
        state.conversations[idx] = { ...state.conversations[idx], ...conv };
      } else {
        state.conversations.unshift(conv);
      }
      state.unreadTotal = recalcUnread(state.conversations);
    },
  },
});

export const {
  setConversations,
  setLoadingInbox,
  setActiveConversation,
  setMessages,
  receiveMessage,
  upsertConversation,
} = chatSlice.actions;

export default chatSlice.reducer;