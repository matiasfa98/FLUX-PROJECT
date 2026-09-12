// client/src/features/chat/hooks/useChatSocket.js
import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "../../../lib/socket";
import {
  receiveMessage,
  setTyping,
  setTypingBot,
  markReadByUser,
  upsertConversation,
  botAdded,
  botRemoved,
} from "../../../store/slices/chatSlice";

export const useChatSocket = () => {
  const dispatch = useDispatch();
  const activeConversationId = useSelector(
    (s) => s.chat.activeConversationId
  );
  const activeRef = useRef(activeConversationId);

  useEffect(() => {
    activeRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // ── Human message ─────────────────────────────────────
    const onMessage = (payload) => {
      dispatch(receiveMessage(payload));

      if (
        payload.conversationId === activeRef.current &&
        payload.sender?.id &&
        payload.sender.id !== socket.user?.id
      ) {
        socket.emit("chat:mark_read", {
          conversationId: payload.conversationId,
        });
      }
    };

    // ── Human typing ──────────────────────────────────────
    const onTyping = ({ conversationId, userId, username, isTyping }) => {
      dispatch(setTyping({ conversationId, userId, username, isTyping }));
    };

    // ── Bot typing ────────────────────────────────────────
    const onBotTyping = ({ conversationId, botId, botName, isTyping }) => {
      dispatch(setTypingBot({ conversationId, botId, botName, isTyping }));
    };

    // ── Bot error ─────────────────────────────────────────
    const onBotError = ({ conversationId, botName, message }) => {
      console.error("[bot error]", botName, message);
    };

    // ── Bot added / removed ───────────────────────────────
    const onBotAdded = ({ conversationId, bot }) => {
      dispatch(botAdded({ conversationId, bot }));
    };

    const onBotRemoved = ({ conversationId, botId }) => {
      dispatch(botRemoved({ conversationId, botId }));
    };

    // ── Read receipts ─────────────────────────────────────
    const onRead = ({ conversationId, userId }) => {
      dispatch(markReadByUser({ conversationId, userId }));
    };

    // ── Inbox preview update ──────────────────────────────
    const onInboxUpdated = ({
      conversationId,
      lastMessagePreview,
      lastMessageAt,
    }) => {
      dispatch(
        upsertConversation({
          id: conversationId,
          lastMessagePreview,
          lastMessageAt,
        })
      );
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("chat:bot-typing", onBotTyping);
    socket.on("chat:bot-error", onBotError);
    socket.on("discussion:bot-added", onBotAdded);
    socket.on("discussion:bot-removed", onBotRemoved);
    socket.on("chat:read", onRead);
    socket.on("chat:inbox-updated", onInboxUpdated);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("chat:bot-typing", onBotTyping);
      socket.off("chat:bot-error", onBotError);
      socket.off("discussion:bot-added", onBotAdded);
      socket.off("discussion:bot-removed", onBotRemoved);
      socket.off("chat:read", onRead);
      socket.off("chat:inbox-updated", onInboxUpdated);
    };
  }, [dispatch]);

  // ── Send message ────────────────────────────────────────
  const sendMessage = useCallback(
    (conversationId, text, attachmentIds = [], opts = {}) => {
      const socket = getSocket();
      if (!socket || !conversationId) return;

      const trimmed = (text || "").trim();
      const hasAttachments =
        Array.isArray(attachmentIds) && attachmentIds.length > 0;

      if (!trimmed && !hasAttachments) return;

      socket.emit("chat:send", {
        conversationId,
        text: trimmed || "(attachment)",
        attachmentIds,
        replyTo: opts.replyTo || null,
      });
    },
    []
  );

  // ── Typing ──────────────────────────────────────────────
  const sendTyping = useCallback((conversationId, isTyping) => {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit("chat:typing", { conversationId, isTyping });
  }, []);

  // ── Join / leave ────────────────────────────────────────
  const joinConversation = useCallback((conversationId) => {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit("conversation:join", { conversationId });
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit("conversation:leave", { conversationId });
  }, []);

  // ── Read ────────────────────────────────────────────────
  const markRead = useCallback((conversationId) => {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit("chat:mark_read", { conversationId });
  }, []);

  // ── Bot management ──────────────────────────────────────
  const addBot = useCallback((conversationId, bot) => {
    const socket = getSocket();
    if (!socket || !conversationId || !bot) return;
    socket.emit("discussion:add-bot", { conversationId, bot });
  }, []);

  const removeBot = useCallback((conversationId, botId) => {
    const socket = getSocket();
    if (!socket || !conversationId || !botId) return;
    socket.emit("discussion:remove-bot", { conversationId, botId });
  }, []);

  const askBot = useCallback((conversationId, botId, messageId) => {
    const socket = getSocket();
    if (!socket || !conversationId || !botId || !messageId) return;
    socket.emit("discussion:bot-ask", { conversationId, botId, messageId });
  }, []);

  return {
    sendMessage,
    sendTyping,
    joinConversation,
    leaveConversation,
    markRead,
    addBot,
    removeBot,
    askBot,
  };
};

export default useChatSocket;