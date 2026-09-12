// client/src/features/chat/components/MessageFeed.jsx
import React, { useEffect, useRef } from "react";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import { MessageItem } from "./MessageItem";

export const MessageFeed = ({
  messages,
  currentUserId,
  loadingInitial,
  hasMore,
  loadingOlder,
  onLoadOlder,
  typingUsers = [],
  typingBots = [],
  conversationType,
  bots = [],
  onAskBot,
}) => {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [conversationType]);

  const handleScroll = (e) => {
    if (e.target.scrollTop < 60 && hasMore && !loadingOlder) {
      onLoadOlder?.();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {loadingOlder && (
        <div
          style={{
            textAlign: "center",
            padding: "8px",
            color: "var(--text-dim)",
            fontSize: "10px",
          }}
        >
          <Loader2
            size={12}
            style={{ animation: "spin 1s linear infinite", display: "inline-block" }}
          />
          <span style={{ marginLeft: "6px" }}>Loading older…</span>
        </div>
      )}

      {loadingInitial ? (
        <div
          style={{
            margin: "auto",
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: "11px",
          }}
        >
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          <div style={{ marginTop: "8px" }}>Loading messages…</div>
        </div>
      ) : messages.length === 0 ? (
        <div
          style={{
            margin: "auto",
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: "11px",
          }}
        >
          <MessageSquare size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
          <div>No messages yet. Say hello!</div>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageItem
            key={msg.id || msg._id}
            message={msg}
            isMine={
              msg.sender?.id === currentUserId ||
              msg.senderId === currentUserId ||
              msg.mine === true
            }
            bots={bots}
            onAskBot={onAskBot}
          />
        ))
      )}

      {/* Human typing */}
      {typingUsers.length > 0 && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-dim)",
            fontStyle: "italic",
            padding: "4px 8px",
          }}
        >
          {typingUsers.map((u) => u.username).join(", ")}{" "}
          {typingUsers.length === 1 ? "is" : "are"} typing…
        </div>
      )}

      {/* Bot typing */}
      {typingBots.length > 0 && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--accent)",
            fontStyle: "italic",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles
            size={11}
            style={{ animation: "spin 2s linear infinite" }}
          />
          <span>
            {typingBots.map((b) => b.botName).join(", ")}{" "}
            {typingBots.length === 1 ? "is" : "are"} thinking…
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageFeed;