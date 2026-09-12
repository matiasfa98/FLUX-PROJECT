// client/src/features/chat/hooks/useTypingIndicator.js
import { useRef, useCallback } from "react";
import { useChatSocket } from "./useChatSocket";

const TYPING_TIMEOUT_MS = 2000;

export const useTypingIndicator = (conversationId) => {
  const { sendTyping } = useChatSocket();
  const timerRef = useRef(null);
  const isTypingRef = useRef(false);

  const onKeystroke = useCallback(() => {
    if (!conversationId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(conversationId, true);
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }, TYPING_TIMEOUT_MS);
  }, [conversationId, sendTyping]);

  const stopTyping = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }
  }, [conversationId, sendTyping]);

  return { onKeystroke, stopTyping };
};

export default useTypingIndicator;