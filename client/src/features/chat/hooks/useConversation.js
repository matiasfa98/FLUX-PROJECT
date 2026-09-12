// client/src/features/chat/hooks/useConversation.js
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setMessages,
  prependMessages,
  setPagination,
} from "../../../store/slices/chatSlice";
import { fetchMessages, markConversationRead } from "../../../services/chatApi";

export const useConversation = (conversationId) => {
  const dispatch = useDispatch();
  const messages = useSelector(
    (s) => s.chat.messagesByConversation[conversationId] || []
  );
  const pagination = useSelector(
    (s) => s.chat.paginationByConversation[conversationId] || {}
  );
  const typingMap = useSelector(
    (s) => s.chat.typingByConversation[conversationId] || {}
  );

  const [loadingInitial, setLoadingInitial] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    (async () => {
      setLoadingInitial(true);
      try {
        const { messages: msgs, hasMore } = await fetchMessages(conversationId, {
          limit: 50,
        });
        if (cancelled) return;

        dispatch(setMessages({ conversationId, messages: msgs }));
        dispatch(setPagination({ conversationId, hasMore, loading: false }));

        await markConversationRead(conversationId);
      } catch (err) {
        console.error("[chat] load messages failed:", err);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, dispatch]);

  const loadOlder = useCallback(async () => {
    if (!conversationId) return;
    if (pagination.loading) return;
    if (pagination.hasMore === false) return;
    if (messages.length === 0) return;

    const oldest = messages[0];
    dispatch(setPagination({ conversationId, loading: true }));

    try {
      const { messages: older, hasMore } = await fetchMessages(conversationId, {
        before: oldest.id,
        limit: 50,
      });

      dispatch(prependMessages({ conversationId, messages: older }));
      dispatch(setPagination({ conversationId, hasMore, loading: false }));
    } catch (err) {
      console.error("[chat] load older failed:", err);
      dispatch(setPagination({ conversationId, loading: false }));
    }
  }, [conversationId, messages, pagination, dispatch]);

  const typingUsers = Object.entries(typingMap)
    .filter(([, v]) => v.expiresAt > Date.now())
    .map(([userId, v]) => ({ userId, username: v.username }));

  return {
    messages,
    loadingInitial,
    hasMore: pagination.hasMore !== false,
    loadingOlder: Boolean(pagination.loading),
    typingUsers,
    loadOlder,
  };
};

export default useConversation;