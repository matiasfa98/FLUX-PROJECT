// client/src/features/chat/hooks/useConversations.js
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setConversations,
  setLoadingInbox,
  setActiveConversation,
} from "../../../store/slices/chatSlice";
import { fetchInbox } from "../../../services/chatApi";
import { useChatSocket } from "./useChatSocket";

export const useConversations = () => {
  const dispatch = useDispatch();
  const conversations = useSelector((s) => s.chat.conversations);
  const loadingInbox = useSelector((s) => s.chat.loadingInbox);
  const activeConversationId = useSelector((s) => s.chat.activeConversationId);
  const unreadTotal = useSelector((s) => s.chat.unreadTotal);

  const { joinConversation, leaveConversation } = useChatSocket();

  const loadInbox = useCallback(async () => {
    dispatch(setLoadingInbox(true));
    try {
      const data = await fetchInbox();
      dispatch(setConversations(data));
    } catch (err) {
      console.error("[chat] inbox load failed:", err);
    } finally {
      dispatch(setLoadingInbox(false));
    }
  }, [dispatch]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const openConversation = useCallback(
    (conversationId) => {
      if (activeConversationId && activeConversationId !== conversationId) {
        leaveConversation(activeConversationId);
      }
      dispatch(setActiveConversation(conversationId));
      if (conversationId) {
        joinConversation(conversationId);
      }
    },
    [activeConversationId, dispatch, joinConversation, leaveConversation]
  );

  return {
    conversations,
    loadingInbox,
    activeConversationId,
    unreadTotal,
    loadInbox,
    openConversation,
  };
};

export default useConversations;