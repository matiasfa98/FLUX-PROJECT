// client/src/features/chat/components/MessageItem.jsx
import React, { useState, useRef, useCallback } from "react";
import { Sparkles, Reply } from "lucide-react";
import { UserAvatar } from "../../../components/common/Avatar/UserAvatar";
import { AttachmentPreview } from "../../workspace/components/AttachmentPreview";

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const HIDE_DELAY_MS = 250;

export const MessageItem = ({ message, isMine, onAskBot, bots = [] }) => {
  const [hovered, setHovered] = useState(false);
  const hideTimerRef = useRef(null);

  const isBot = Boolean(message.senderBot);
  const senderName = isBot
    ? message.senderBot.name
    : message.sender?.username || message.senderName || "Operator";
  const senderAvatar = isBot
    ? message.senderBot.avatar
    : message.sender?.avatar;

  const hasAttachments =
    Array.isArray(message.attachments) && message.attachments.length > 0;

  const showMenu = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setHovered(true);
  }, []);

  const hideMenu = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setHovered(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, []);

  const showAskAi = hovered && bots.length > 0 && !isBot && onAskBot;

  return (
    <div
      onMouseEnter={showMenu}
      onMouseLeave={hideMenu}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isMine && !isBot ? "flex-end" : "flex-start",
        marginBottom: "12px",
        maxWidth: "80%",
        alignSelf: isMine && !isBot ? "flex-end" : "flex-start",
        position: "relative",
      }}
    >
      {/* Sender row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "3px",
          flexDirection: isMine && !isBot ? "row-reverse" : "row",
        }}
      >
        {isBot ? (
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              border: "1px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={10} color="var(--accent)" />
          </div>
        ) : (
          <UserAvatar
            user={{ username: senderName, avatar: senderAvatar }}
            size={18}
            radius="50%"
            bordered={false}
          />
        )}
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: isBot
              ? "var(--accent)"
              : isMine
              ? "var(--accent)"
              : "var(--text-muted)",
          }}
        >
          {isBot ? `🤖 ${senderName}` : isMine ? "You" : senderName}
        </span>
        {isBot && message.senderBot.model && (
          <span
            style={{
              fontSize: "8px",
              color: "var(--text-dim)",
              padding: "1px 4px",
              borderRadius: "3px",
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--border-color)",
            }}
          >
            {message.senderBot.provider} · {message.senderBot.model}
          </span>
        )}
        <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>
          {formatTime(message.createdAt)}
        </span>
      </div>

      {/* Bubble + action menu */}
      <div
        style={{
          position: "relative",
          maxWidth: "100%",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          flexDirection: isMine ? "row-reverse" : "row",
        }}
      >
        <div
          style={{
            backgroundColor: isBot
              ? "rgba(99, 102, 241, 0.08)"
              : isMine
              ? "var(--accent)"
              : "var(--bg-panel)",
            border: isBot
              ? "1px solid var(--accent)"
              : isMine
              ? "none"
              : "1px solid var(--border-color)",
            color: isMine && !isBot ? "#ffffff" : "var(--text-main)",
            borderRadius: "12px",
            padding: "8px 12px",
            fontSize: "12px",
            lineHeight: 1.45,
            wordBreak: "break-word",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {message.text && message.text !== "(attachment)" && (
            <span style={{ whiteSpace: "pre-wrap" }}>{message.text}</span>
          )}

          {hasAttachments && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop:
                  message.text && message.text !== "(attachment)" ? "4px" : "0",
              }}
            >
              {message.attachments.map((att) => (
                <AttachmentPreview key={att.id || att._id} attachment={att} />
              ))}
            </div>
          )}
        </div>

        {/* Ask AI button — inline, next to the bubble */}
        {showAskAi && (
          <button
            onMouseEnter={showMenu}
            onMouseLeave={hideMenu}
            onClick={() => onAskBot(message)}
            title="Ask a bot about this message"
            style={{
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Reply size={10} />
            <span>Ask AI</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageItem;