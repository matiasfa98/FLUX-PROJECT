// client/src/features/chat/components/MessageInput.jsx
import React, { useRef, useState } from "react";
import { Send, Paperclip, Loader2, X } from "lucide-react";
import { apiRequest } from "../../../lib/api";

export const MessageInput = ({ roomId, onSend, disabled = false }) => {
  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!roomId) {
      alert("Cannot upload: room not resolved yet.");
      return;
    }

    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      alert(`File too large. Max ${MAX / 1024 / 1024} MB.`);
      return;
    }

    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          const idx = result.indexOf(",");
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const res = await apiRequest(`/attachments/rooms/${roomId}`, {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          data: base64,
        }),
      });

      setPendingAttachment(res.attachment);
    } catch (err) {
      console.error("[attachment] upload failed:", err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (!text.trim() && !pendingAttachment) return;

    const attachmentIds = pendingAttachment ? [pendingAttachment.id] : [];
    onSend(text.trim(), attachmentIds);

    setText("");
    setPendingAttachment(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "10px 12px",
        borderTop: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-panel)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      {pendingAttachment && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            padding: "6px 10px",
            backgroundColor: "var(--bg-subpanel)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "11px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: 0,
            }}
          >
            <Paperclip size={12} color="var(--accent)" />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--text-main)",
              }}
            >
              {pendingAttachment.originalName}
            </span>
            <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>
              ({(pendingAttachment.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPendingAttachment(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--danger)",
              cursor: "pointer",
              padding: "2px 4px",
              display: "flex",
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          placeholder={disabled ? "Select a conversation..." : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: "var(--bg-subpanel)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "var(--text-main)",
            outline: "none",
            fontFamily: "monospace",
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled || !roomId}
          title="Attach a file"
          style={{
            backgroundColor: "transparent",
            border: "1px solid var(--border-color)",
            color: uploading ? "var(--text-dim)" : "var(--text-muted)",
            borderRadius: "6px",
            padding: "7px 10px",
            cursor: uploading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {uploading ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Paperclip size={14} />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            handleFileSelect(file);
            e.target.value = "";
          }}
        />

        <button
          type="submit"
          disabled={disabled || (!text.trim() && !pendingAttachment)}
          style={{
            backgroundColor: "var(--accent)",
            border: "none",
            color: "#ffffff",
            borderRadius: "6px",
            padding: "8px 14px",
            cursor:
              disabled || (!text.trim() && !pendingAttachment)
                ? "not-allowed"
                : "pointer",
            opacity: disabled || (!text.trim() && !pendingAttachment) ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          <Send size={12} />
          <span>Send</span>
        </button>
      </div>
    </form>
  );
};

export default MessageInput;