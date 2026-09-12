// client/src/features/chat/components/CreateGroupModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { X, Users, Check, Loader2, Search, Sparkles } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";
import { createConversation } from "../../../services/chatApi";
import { BotPickerModal } from "./BotPickerModal";

export const CreateGroupModal = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [bots, setBots] = useState([]);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Load candidate users across all your rooms.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    (async () => {
      setLoadingCandidates(true);
      setError("");
      try {
        const rooms = await apiRequest("/rooms");
        const seen = new Map();
        for (const room of rooms || []) {
          for (const m of room.members || []) {
            const u = m.user;
            if (!u) continue;
            const id = String(u._id || u.id);
            if (id === currentUserId) continue;
            if (!seen.has(id)) {
              seen.set(id, {
                id,
                username: u.username,
                avatar: u.avatar,
                roomId: String(room._id),
                roomName: room.name,
              });
            }
          }
        }
        if (!cancelled) setCandidates(Array.from(seen.values()));
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load users");
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = search.toLowerCase();
    return candidates.filter((c) => c.username.toLowerCase().includes(q));
  }, [candidates, search]);

  const toggleUser = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddBot = (bot) => {
    setBots((prev) => [...prev, bot]);
  };

  const removeBot = (index) => {
    setBots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    setError("");

    if (!name.trim()) {
      setError("Discussion name is required");
      return;
    }
    if (selected.size < 1) {
      setError("Pick at least 1 other person");
      return;
    }

    const selectedArr = Array.from(selected);
    const selectedUsers = selectedArr.map((id) =>
      candidates.find((c) => c.id === id)
    );

    // All humans must be in the same room.
    const roomIds = new Set(selectedUsers.map((u) => u?.roomId));
    if (roomIds.size !== 1) {
      setError(
        "All selected members must belong to the same room. Pick fewer people."
      );
      return;
    }

    const roomId = selectedUsers[0].roomId;

    setCreating(true);
    try {
      const conv = await createConversation({
        roomId,
        type: "discussion",
        name: name.trim(),
        participantIds: selectedArr,
        bots,
      });

      setName("");
      setSelected(new Set());
      setBots([]);
      setSearch("");
      onCreated?.(conv);
    } catch (err) {
      setError(err.message || "Failed to create discussion");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9998,
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            backgroundColor: "var(--bg-panel)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "85vh",
            fontFamily: "monospace",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={16} color="var(--accent)" />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  letterSpacing: "0.04em",
                }}
              >
                NEW DISCUSSION
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "var(--danger)",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
              >
                {error}
              </div>
            )}

            {/* Name */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  fontWeight: 700,
                }}
              >
                DISCUSSION NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Backend Sprint"
                maxLength={100}
                style={{
                  backgroundColor: "var(--bg-subpanel)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  color: "var(--text-main)",
                  outline: "none",
                  fontFamily: "monospace",
                }}
              />
            </div>

            {/* Selected users chips */}
            {selected.size > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {Array.from(selected).map((id) => {
                  const u = candidates.find((c) => c.id === id);
                  if (!u) return null;
                  return (
                    <span
                      key={id}
                      onClick={() => toggleUser(id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        backgroundColor: "var(--accent)",
                        color: "#fff",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                    >
                      {u.username}
                      <X size={10} />
                    </span>
                  );
                })}
              </div>
            )}

            {/* Selected bots chips */}
            {bots.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {bots.map((b, i) => (
                  <span
                    key={i}
                    onClick={() => removeBot(i)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(99, 102, 241, 0.15)",
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <Sparkles size={9} />
                    {b.name}
                    <X size={10} />
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "6px 10px",
              }}
            >
              <Search size={12} color="var(--text-dim)" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
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

            {/* Candidates */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {loadingCandidates ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "var(--text-dim)",
                    fontSize: "11px",
                  }}
                >
                  <Loader2
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "var(--text-dim)",
                    fontSize: "11px",
                  }}
                >
                  No users found
                </div>
              ) : (
                filtered.map((u) => {
                  const isSelected = selected.has(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        backgroundColor: isSelected
                          ? "var(--bg-active)"
                          : "transparent",
                        border: "none",
                        borderLeft: isSelected
                          ? "2px solid var(--accent)"
                          : "2px solid transparent",
                        color: "var(--text-main)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "var(--bg-subpanel)",
                            border: "1px solid var(--border-color)",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            u.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{u.username}</span>
                          <span
                            style={{ fontSize: "9px", color: "var(--text-dim)" }}
                          >
                            in {u.roomName}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check size={12} color="var(--accent)" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Add bot button */}
            <button
              type="button"
              onClick={() => setShowBotPicker(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px",
                backgroundColor: "var(--bg-subpanel)",
                border: "1px dashed var(--border-color)",
                color: "var(--text-muted)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <Sparkles size={12} color="var(--accent)" />
              <span>Add AI Bots ({bots.length})</span>
            </button>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            <button
              onClick={onClose}
              type="button"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                padding: "6px 14px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              type="button"
              style={{
                backgroundColor: "var(--accent)",
                border: "none",
                color: "#fff",
                padding: "6px 16px",
                borderRadius: "4px",
                cursor: creating ? "not-allowed" : "pointer",
                opacity: creating ? 0.6 : 1,
                fontSize: "11px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {creating ? (
                <>
                  <Loader2
                    size={11}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span>Creating…</span>
                </>
              ) : (
                <span>Create Discussion</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bot picker (nested) */}
      <BotPickerModal
        isOpen={showBotPicker}
        onClose={() => setShowBotPicker(false)}
        existingBots={bots}
        onAdd={handleAddBot}
      />
    </>
  );
};

export default CreateGroupModal;