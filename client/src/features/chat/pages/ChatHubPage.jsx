// client/src/features/chat/pages/ChatHubPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Search,
  Hash,
  Users,
  Plus,
  Loader2,
  MessageSquare,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { useConversations } from "../hooks/useConversations";
import { useConversation } from "../hooks/useConversation";
import { useChatSocket } from "../hooks/useChatSocket";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { MessageFeed } from "../components/MessageFeed";
import { MessageInput } from "../components/MessageInput";
import { BotPickerModal } from "../components/BotPickerModal";
import { UserAvatar } from "../../../components/common/Avatar/UserAvatar";

export default function ChatHubPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  const {
    conversations,
    loadingInbox,
    activeConversationId,
    openConversation,
    loadInbox,
  } = useConversations();

  const { sendMessage, markRead, addBot, removeBot, askBot } = useChatSocket();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showBotPicker, setShowBotPicker] = useState(false);

  // Sync route param → active conversation.
  useEffect(() => {
    if (threadId && threadId !== activeConversationId) {
      openConversation(threadId);
    }
  }, [threadId, activeConversationId, openConversation]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const {
    messages,
    loadingInitial,
    hasMore,
    loadingOlder,
    typingUsers,
    loadOlder,
  } = useConversation(activeConversationId);

  const { onKeystroke, stopTyping } = useTypingIndicator(activeConversationId);

  // Bot typing list for the active conversation.
  const typingBotsRaw = useSelector(
    (s) =>
      (s.chat.typingBotsByConversation &&
        s.chat.typingBotsByConversation[activeConversationId]) ||
      {}
  );

  const typingBotList = useMemo(() => {
    const now = Date.now();
    return Object.entries(typingBotsRaw)
      .filter(([, v]) => v.expiresAt > now)
      .map(([botId, v]) => ({ botId, botName: v.botName }));
  }, [typingBotsRaw]);

  useEffect(() => {
    if (activeConversationId) markRead(activeConversationId);
  }, [activeConversationId, markRead]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      if (c.name && c.name.toLowerCase().includes(q)) return true;
      return c.participants?.some(
        (p) =>
          p.id !== currentUserId && p.username.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, currentUserId]);

  const handleSend = (text, attachmentIds) => {
    if (!activeConversationId) return;
    sendMessage(activeConversationId, text, attachmentIds);
    stopTyping();
  };

  const handleInputChange = (e) => {
    onKeystroke();
  };

  const handleSelectConversation = (convId) => {
    openConversation(convId);
    navigate(`/chat/${convId}`, { replace: true });
  };

  const conversationLabel = (conv) => {
    if (conv.type === "discussion" || conv.type === "group")
      return conv.name || "Discussion";
    if (conv.type === "room") return conv.room?.name || "Room";
    const peer = conv.participants?.find((p) => p.id !== currentUserId);
    return peer?.username || "Unknown";
  };

  const conversationTypeLabel = (conv) => {
    if (conv.type === "dm") return "Direct message";
    if (conv.type === "discussion" || conv.type === "group") {
      const count = conv.participants?.length || 0;
      const bots = conv.bots?.length || 0;
      return `${count} member${count === 1 ? "" : "s"}${
        bots ? ` · ${bots} bot${bots === 1 ? "" : "s"}` : ""
      }`;
    }
    if (conv.type === "room") return `Room · ${conv.room?.name || ""}`;
    return "";
  };

  const isDiscussion =
    activeConv?.type === "discussion" || activeConv?.type === "group";

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        backgroundColor: "var(--bg-main)",
        color: "var(--text-main)",
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      {/* LEFT: INBOX */}
      <aside
        style={{
          width: "300px",
          backgroundColor: "var(--bg-panel)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "12px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.05em",
              }}
            >
              CONVERSATIONS
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => setShowCreateGroup(true)}
                title="New discussion"
                style={{
                  background: "var(--bg-subpanel)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  padding: "3px 6px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Plus size={11} />
              </button>
              <button
                onClick={loadInbox}
                title="Refresh"
                style={{
                  background: "var(--bg-subpanel)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  padding: "3px 6px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  lineHeight: 1,
                }}
              >
                ⟳
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              padding: "5px 8px",
            }}
          >
            <Search size={12} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "11px",
                color: "var(--text-main)",
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingInbox && conversations.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: "11px",
              }}
            >
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
              <div style={{ marginTop: "8px" }}>Loading inbox…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              <MessageSquare
                size={24}
                style={{ margin: "0 auto 8px", opacity: 0.4 }}
              />
              <div>
                {searchQuery
                  ? "No conversations match."
                  : "No conversations yet. Start a discussion."}
              </div>
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const label = conversationLabel(conv);
              const hasUnread = conv.unreadCount > 0;
              const isDisc =
                conv.type === "discussion" || conv.type === "group";

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    background: isActive ? "var(--bg-active)" : "transparent",
                    border: "none",
                    borderLeft: isActive
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                    color: isActive ? "var(--text-main)" : "var(--text-muted)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      marginTop: "2px",
                      flexShrink: 0,
                      color: isActive ? "var(--accent)" : "var(--text-dim)",
                    }}
                  >
                    {isDisc ? (
                      <Users size={14} />
                    ) : conv.type === "room" ? (
                      <Hash size={14} />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: hasUnread ? 800 : 600,
                          color: "var(--text-main)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </span>
                      {hasUnread && (
                        <span
                          style={{
                            minWidth: "16px",
                            height: "16px",
                            padding: "0 4px",
                            borderRadius: "8px",
                            backgroundColor: "var(--accent)",
                            color: "#fff",
                            fontSize: "9px",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-dim)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: "2px",
                      }}
                    >
                      {conv.lastMessagePreview || "No messages yet"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT: ACTIVE CONVERSATION */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-main)",
        }}
      >
        {!activeConv ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              color: "var(--text-dim)",
              fontSize: "12px",
            }}
          >
            <MessageSquare size={40} style={{ opacity: 0.3 }} />
            <div>Select a conversation to start chatting</div>
            <div style={{ fontSize: "10px", opacity: 0.7 }}>
              Or create a discussion with the + button
            </div>
          </div>
        ) : (
          <>
            <header
              style={{
                height: "48px",
                padding: "0 16px",
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-panel)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minWidth: 0,
                }}
              >
                <button
                  onClick={() => {
                    openConversation(null);
                    navigate("/chat", { replace: true });
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {isDiscussion ? (
                  <Users size={16} color="var(--accent)" />
                ) : activeConv.type === "room" ? (
                  <Hash size={16} color="var(--accent)" />
                ) : (
                  <MessageSquare size={16} color="var(--accent)" />
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conversationLabel(activeConv)}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                    {conversationTypeLabel(activeConv)}
                  </span>
                </div>
              </div>

              {isDiscussion && (
                <button
                  onClick={() => setShowBotPicker(true)}
                  title="Manage bots"
                  style={{
                    background: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "10px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={11} color="var(--accent)" />
                  <span>
                    Bots ({activeConv.bots?.length || 0})
                  </span>
                </button>
              )}
            </header>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <MessageFeed
                messages={messages}
                currentUserId={currentUserId}
                loadingInitial={loadingInitial}
                hasMore={hasMore}
                loadingOlder={loadingOlder}
                onLoadOlder={loadOlder}
                typingUsers={typingUsers}
                typingBots={typingBotList}
                conversationType={activeConv.type}
                bots={activeConv.bots || []}
                onAskBot={(msg) => {
                  const bot = activeConv.bots?.[0];
                  if (bot && msg?.id) {
                    askBot(activeConv.id, bot.id, msg.id);
                  }
                }}
              />
            </div>

            <MessageInput
              roomId={activeConv?.room?.id}
              onSend={handleSend}
              disabled={!activeConversationId}
            />
          </>
        )}
      </main>

      {/* Create discussion modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={(conv) => {
          setShowCreateGroup(false);
          loadInbox();
          if (conv?.id) handleSelectConversation(conv.id);
        }}
      />

      {/* Bot picker modal */}
      {isDiscussion && (
        <BotPickerModal
          isOpen={showBotPicker}
          onClose={() => setShowBotPicker(false)}
          existingBots={activeConv?.bots || []}
          onAdd={(bot) => addBot(activeConv.id, bot)}
        />
      )}
    </div>
  );
}