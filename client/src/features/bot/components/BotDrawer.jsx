// client/src/features/bot/components/BotDrawer.jsx
import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  ArrowLeft,
  X,
  Send,
  Bot,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Zap,
} from "lucide-react";
import { apiRequest } from "../../../lib/api";

export const BotDrawer = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  const isOpen = useSelector(
    (state) =>
      state.bot?.isOpen ??
      state.bot?.isDrawerOpen ??
      state.ui?.botDrawerOpen ??
      state.ui?.botOpen ??
      false
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [lastProvider, setLastProvider] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Flux AI Copilot ready. Ask about code, bugs, Docker configs, or anything in your workspace.",
      timestamp: "Just now",
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const closeDrawer = () => {
    dispatch({ type: "bot/toggleDrawer" });
    dispatch({ type: "ui/toggleBotDrawer" });
    dispatch({ type: "bot/closeDrawer" });
  };

  useEffect(() => {
    if (isOpen) closeDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) closeDrawer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      // Send only the last 10 messages.
      const payload = {
        messages: nextHistory.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const res = await apiRequest("/ai/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setLastProvider({
        providerName: res.providerName,
        model: res.model,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: res.reply || "(empty response)",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `Error: ${err.message || "Failed to reach AI providers."}`,
          isError: true,
          timestamp: "Alert",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    { label: "Explain", prompt: "Explain the current code structure." },
    { label: "Find Bugs", prompt: "Scan for likely bugs or edge cases." },
    { label: "Docker", prompt: "How should I configure Docker for this?" },
    { label: "Refactor", prompt: "Suggest a cleaner refactor." },
  ];

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={closeDrawer}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(3px)",
          zIndex: 998,
          cursor: "pointer",
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "420px",
          maxWidth: "90vw",
          height: "100vh",
          backgroundColor: "var(--bg-panel)",
          borderLeft: "1px solid var(--border-color)",
          boxShadow: "-10px 0 36px rgba(0, 0, 0, 0.45)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
          animation: "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: "46px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-subpanel)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={closeDrawer}
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginLeft: "4px",
              }}
            >
              <Bot size={15} color="var(--accent)" />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                }}
              >
                COPILOT
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setMessages([messages[0]])}
              title="Reset conversation"
              style={{
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-dim)",
                width: "26px",
                height: "26px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Trash2 size={12} />
            </button>

            <button
              onClick={closeDrawer}
              title="Close (Esc)"
              style={{
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                width: "26px",
                height: "26px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Provider badge */}
        {lastProvider && (
          <div
            style={{
              padding: "6px 12px",
              borderBottom: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-main)",
              fontSize: "10px",
              color: "var(--text-dim)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <Zap size={11} color="var(--online)" />
            <span>
              Active:{" "}
              <strong style={{ color: "var(--text-main)" }}>
                {lastProvider.providerName}
              </strong>{" "}
              · <code>{lastProvider.model}</code>
            </span>
          </div>
        )}

        {/* Quick prompts */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            padding: "8px 12px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-main)",
            flexShrink: 0,
          }}
        >
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.prompt)}
              style={{
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            backgroundColor: "var(--bg-main)",
          }}
        >
          {messages.map((m, idx) => {
            const isBot = m.role === "assistant";
            return (
              <div
                key={m.id || idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  alignSelf: isBot ? "flex-start" : "flex-end",
                  maxWidth: "90%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "9px",
                    color: "var(--text-dim)",
                    justifyContent: isBot ? "flex-start" : "flex-end",
                  }}
                >
                  <span>{isBot ? "COPILOT" : "OPERATOR"}</span>
                  <span>|</span>
                  <span>{m.timestamp}</span>
                </div>

                <div
                  style={{
                    backgroundColor: m.isError
                      ? "rgba(239, 68, 68, 0.1)"
                      : isBot
                      ? "var(--bg-panel)"
                      : "var(--accent)",
                    border: m.isError
                      ? "1px solid rgba(239, 68, 68, 0.4)"
                      : isBot
                      ? "1px solid var(--border-color)"
                      : "none",
                    borderRadius: "5px",
                    padding: "8px 11px",
                    color: m.isError
                      ? "var(--danger)"
                      : isBot
                      ? "var(--text-main)"
                      : "#ffffff",
                    fontSize: "11px",
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    position: "relative",
                  }}
                >
                  {m.content}

                  {isBot && !m.isError && (
                    <button
                      onClick={() => handleCopy(m.content, idx)}
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        background: "none",
                        border: "none",
                        color: "var(--text-dim)",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      {copiedIndex === idx ? (
                        <Check size={11} color="var(--online)" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--accent)",
                fontSize: "11px",
              }}
            >
              <Sparkles
                size={13}
                style={{ animation: "spin 2s linear infinite" }}
              />
              <span>Thinking…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            padding: "10px 12px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-panel)",
            display: "flex",
            gap: "8px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              padding: "7px 10px",
              fontSize: "11px",
              color: "var(--text-main)",
              outline: "none",
              fontFamily: "monospace",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              backgroundColor: "var(--accent)",
              border: "none",
              color: "#ffffff",
              borderRadius: "4px",
              padding: "0 12px",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={12} />
          </button>
        </form>
      </aside>
    </>
  );
};

export default BotDrawer;