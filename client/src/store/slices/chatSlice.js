// client/src/store/slices/chatSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  conversations: [],
  messagesByConversation: {},
  paginationByConversation: {},
  activeConversationId: null,
  typingByConversation: {},
  typingBotsByConversation: {}, // { [convId]: { [botId]: { botName, expiresAt } } }
  unreadTotal: 0,
  loadingInbox: false,
};

const recalcUnreadTotal = (conversations) =>
  conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload || [];
      state.unreadTotal = recalcUnreadTotal(state.conversations);
    },

    setLoadingInbox: (state, action) => {
      state.loadingInbox = Boolean(action.payload);
    },

    upsertConversation: (state, action) => {
      const conv = action.payload;
      if (!conv?.id) return;

      const idx = state.conversations.findIndex((c) => c.id === conv.id);
      if (idx >= 0) {
        state.conversations[idx] = { ...state.conversations[idx], ...conv };
      } else {
        state.conversations.unshift(conv);
      }

      state.conversations.sort(
        (a, b) =>
          new Date(b.lastMessageAt || 0).getTime() -
          new Date(a.lastMessageAt || 0).getTime()
      );

      state.unreadTotal = recalcUnreadTotal(state.conversations);
    },

    setActiveConversation: (state, action) => {
      const id = action.payload || null;
      state.activeConversationId = id;

      if (id) {
        const conv = state.conversations.find((c) => c.id === id);
        if (conv && conv.unreadCount) {
          conv.unreadCount = 0;
          state.unreadTotal = recalcUnreadTotal(state.conversations);
        }
      }
    },

    setMessages: (state, action) => {
      const { conversationId, messages } = action.payload || {};
      if (!conversationId) return;
      state.messagesByConversation[conversationId] = messages || [];
    },

    prependMessages: (state, action) => {
      const { conversationId, messages } = action.payload || {};
      if (!conversationId) return;
      const existing = state.messagesByConversation[conversationId] || [];
      state.messagesByConversation[conversationId] = [
        ...(messages || []),
        ...existing,
      ];
    },

    receiveMessage: (state, action) => {
      const msg = action.payload;
      if (!msg?.conversationId) return;

      const convId = msg.conversationId;
      const list = state.messagesByConversation[convId] || [];

      if (msg.id && list.some((m) => m.id === msg.id)) return;

      state.messagesByConversation[convId] = [...list, msg];

      const conv = state.conversations.find((c) => c.id === convId);
      if (conv) {
        conv.lastMessagePreview = msg.text?.slice(0, 80) || "";
        conv.lastMessageAt = msg.createdAt || new Date().toISOString();
      }
      state.conversations.sort(
        (a, b) =>
          new Date(b.lastMessageAt || 0).getTime() -
          new Date(a.lastMessageAt || 0).getTime()
      );
    },

    setPagination: (state, action) => {
      const { conversationId, hasMore, loading } = action.payload || {};
      if (!conversationId) return;
      state.paginationByConversation[conversationId] = {
        ...(state.paginationByConversation[conversationId] || {}),
        ...(hasMore !== undefined ? { hasMore } : {}),
        ...(loading !== undefined ? { loading } : {}),
      };
    },

    setTyping: (state, action) => {
      const { conversationId, userId, username, isTyping } =
        action.payload || {};
      if (!conversationId) return;

      if (!state.typingByConversation[conversationId]) {
        state.typingByConversation[conversationId] = {};
      }

      if (isTyping) {
        state.typingByConversation[conversationId][userId] = {
          username,
          expiresAt: Date.now() + 4000,
        };
      } else {
        delete state.typingByConversation[conversationId][userId];
      }
    },

    setTypingBot: (state, action) => {
      const { conversationId, botId, botName, isTyping } = action.payload || {};
      if (!conversationId || !botId) return;

      if (!state.typingBotsByConversation[conversationId]) {
        state.typingBotsByConversation[conversationId] = {};
      }

      if (isTyping) {
        state.typingBotsByConversation[conversationId][botId] = {
          botName,
          expiresAt: Date.now() + 60000,
        };
      } else {
        delete state.typingBotsByConversation[conversationId][botId];
      }
    },

    clearTyping: (state, action) => {
      const { conversationId, userId } = action.payload || {};
      if (!conversationId) return;
      if (state.typingByConversation[conversationId]) {
        delete state.typingByConversation[conversationId][userId];
      }
    },

    markReadByUser: (state, action) => {
      const { conversationId, userId } = action.payload || {};
      if (!conversationId || !userId) return;
      const list = state.messagesByConversation[conversationId];
      if (!list) return;

      for (const m of list) {
        if (!m.readBy) m.readBy = [];
        if (!m.readBy.includes(userId)) m.readBy.push(userId);
      }
    },

    botAdded: (state, action) => {
      const { conversationId, bot } = action.payload || {};
      if (!conversationId || !bot) return;

      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      if (!conv.bots) conv.bots = [];
      if (!conv.bots.some((b) => b.id === bot.id)) {
        conv.bots.push(bot);
      }
    },

    botRemoved: (state, action) => {
      const { conversationId, botId } = action.payload || {};
      if (!conversationId || !botId) return;

      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv || !conv.bots) return;
      conv.bots = conv.bots.filter((b) => b.id !== botId);
    },

    addOptimisticMessage: (state, action) => {
      const msg = action.payload;
      if (!msg?.conversationId || !msg?.id) return;
      const list = state.messagesByConversation[msg.conversationId] || [];
      state.messagesByConversation[msg.conversationId] = [...list, msg];
    },

    reconcileOptimistic: (state, action) => {
      const { conversationId, optimisticId, realId } = action.payload || {};
      if (!conversationId || !optimisticId || !realId) return;
      const list = state.messagesByConversation[conversationId] || [];
      const idx = list.findIndex((m) => m.id === optimisticId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], id: realId, pending: false };
      }
    },

    removeOptimistic: (state, action) => {
      const { conversationId, optimisticId } = action.payload || {};
      if (!conversationId || !optimisticId) return;
      const list = state.messagesByConversation[conversationId] || [];
      state.messagesByConversation[conversationId] = list.filter(
        (m) => m.id !== optimisticId
      );
    },
  },
});

export const {
  setConversations,
  setLoadingInbox,
  upsertConversation,
  setActiveConversation,
  setMessages,
  prependMessages,
  receiveMessage,
  setPagination,
  setTyping,
  setTypingBot,
  clearTyping,
  markReadByUser,
  botAdded,
  botRemoved,
  addOptimisticMessage,
  reconcileOptimistic,
  removeOptimistic,
} = chatSlice.actions;

export default chatSlice.reducer;