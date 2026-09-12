// src/features/workspace/pages/RoomLobbyPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Plus,
  ArrowRight,
  Lock,
  Globe,
  Users,
  Terminal,
  RefreshCw,
  Loader2,
  X,
  Search,
} from "lucide-react";
import { io } from "socket.io-client";
import { apiRequest } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { UserAvatar } from "../../../components/common/Avatar/UserAvatar";

export default function RoomLobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create-form state
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "mine"

  const searchQueryRef = useRef("");
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // ── Fetch my rooms ────────────────────────────────────────
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/rooms");
      setRooms(data || []);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Live room list updates ────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("flux_token") || "";
    const socketUrl = import.meta.env.VITE_WS_URL || "http://localhost:4000";

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const handleListChanged = () => {
      apiRequest("/rooms")
        .then((data) => setRooms(data || []))
        .catch(() => {});

      const q = searchQueryRef.current.trim();
      if (q) {
        apiRequest(`/rooms/search?q=${encodeURIComponent(q)}`)
          .then((data) => setSearchResults(data || []))
          .catch(() => {});
      }
    };

    socket.on("rooms:list-changed", handleListChanged);

    return () => {
      socket.off("rooms:list-changed", handleListChanged);
      socket.disconnect();
    };
  }, []);

  // ── Debounced search ──────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);

    const t = setTimeout(async () => {
      try {
        const data = await apiRequest(
          `/rooms/search?q=${encodeURIComponent(q)}`
        );
        setSearchResults(data || []);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchRooms();
  }, []);

  // ── Create room ───────────────────────────────────────────
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await apiRequest("/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: roomName.trim(),
          description: description.trim(),
          language,
          isPrivate,
        }),
      });

      setShowCreateModal(false);
      navigate(`/workspace/${res.room._id}`);
    } catch (err) {
      setError(err.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────
  const isSearchMode = searchResults !== null;

  const displayedRooms = useMemo(() => {
    const source = isSearchMode ? searchResults : rooms;
    if (filter === "mine") {
      return source.filter((rm) =>
        rm.members?.some(
          (m) => String(m.user?._id || m.user) === currentUserId
        )
      );
    }
    return source;
  }, [isSearchMode, searchResults, rooms, filter, currentUserId]);

  const myRoomsCount = useMemo(
    () =>
      rooms.filter((rm) =>
        rm.members?.some(
          (m) => String(m.user?._id || m.user) === currentUserId
        )
      ).length,
    [rooms, currentUserId]
  );

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        backgroundColor: "var(--bg-main)",
        color: "var(--text-main)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          maxWidth: "1100px",
          width: "100%",
          margin: "0 auto",
          padding: "40px 24px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              <UserAvatar user={user} size={48} radius="10px" />
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    margin: "0 0 4px",
                    color: "var(--text-main)",
                  }}
                >
                  {isSearchMode
                    ? `Search results for "${searchQuery}"`
                    : `Welcome back, ${user?.username || "Operator"}`}
                </h1>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    margin: 0,
                  }}
                >
                  {isSearchMode
                    ? `${displayedRooms.length} public room${
                        displayedRooms.length === 1 ? "" : "s"
                      } matched.`
                    : `${myRoomsCount} active room${
                        myRoomsCount === 1 ? "" : "s"
                      } in your mesh.`}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={fetchRooms}
                style={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                title="Refresh rooms"
              >
                <RefreshCw size={13} />
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 0 14px var(--accent-glow)",
                }}
              >
                <Plus size={14} />
                <span>Deploy Cockpit</span>
              </button>
            </div>
          </div>

          {/* SEARCH + FILTER ROW */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--bg-panel)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "8px 12px",
                flex: 1,
                minWidth: "240px",
                maxWidth: "480px",
              }}
            >
              <Search size={14} color="var(--text-dim)" />
              <input
                type="text"
                placeholder="Search public rooms by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-main)",
                  fontSize: "12px",
                  fontFamily: "inherit",
                }}
              />
              {searching && (
                <Loader2
                  size={12}
                  style={{
                    color: "var(--text-dim)",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
              {searchQuery && !searching && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                backgroundColor: "var(--bg-panel)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "3px",
              }}
            >
              <button
                onClick={() => setFilter("all")}
                style={{
                  background: filter === "all" ? "var(--bg-active)" : "transparent",
                  border: "none",
                  color: filter === "all" ? "var(--text-main)" : "var(--text-dim)",
                  padding: "5px 12px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                All Rooms
              </button>
              <button
                onClick={() => setFilter("mine")}
                style={{
                  background: filter === "mine" ? "var(--bg-active)" : "transparent",
                  border: "none",
                  color: filter === "mine" ? "var(--text-main)" : "var(--text-dim)",
                  padding: "5px 12px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                My Rooms ({myRoomsCount})
              </button>
            </div>
          </div>
        </div>

        {/* ROOM GRID */}
        {loading && !isSearchMode ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "var(--text-dim)",
            }}
          >
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span>Scanning room cluster...</span>
          </div>
        ) : displayedRooms.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              backgroundColor: "var(--bg-panel)",
              border: "1px dashed var(--border-color)",
              borderRadius: "8px",
            }}
          >
            <Terminal
              size={32}
              color="var(--text-dim)"
              style={{ margin: "0 auto 12px" }}
            />
            <h3
              style={{
                fontSize: "16px",
                color: "var(--text-main)",
                margin: "0 0 6px",
              }}
            >
              {isSearchMode
                ? "No matching public rooms"
                : filter === "mine"
                ? "You haven't joined any rooms yet"
                : "No active rooms discovered"}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-dim)",
                marginBottom: "16px",
              }}
            >
              {isSearchMode
                ? "Try a different search term, or create your own room."
                : filter === "mine"
                ? "Deploy a new cockpit or join a public room to get started."
                : "Be the first operator to initialize a cockpit in this mesh."}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: "var(--accent)",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Create a Room
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {displayedRooms.map((rm) => {
              const members = rm.members || [];
              const isMember = members.some(
                (m) => String(m.user?._id || m.user) === currentUserId
              );
              const isPrivateRoom = rm.settings?.access === "private";
              const visibleAvatars = members.slice(0, 4);
              const remaining = Math.max(0, members.length - visibleAvatars.length);

              return (
                <div
                  key={rm._id}
                  onClick={() => navigate(`/workspace/${rm._id}`)}
                  style={{
                    backgroundColor: "var(--bg-panel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    cursor: "pointer",
                    transition:
                      "border-color 0.15s ease, background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.backgroundColor = "var(--bg-panel)";
                  }}
                >
                  {/* Title + language */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "8px",
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
                      {isPrivateRoom ? (
                        <Lock size={13} color="var(--warning)" />
                      ) : (
                        <Globe size={13} color="var(--online)" />
                      )}
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--text-main)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rm.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "monospace",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-subpanel)",
                        border: "1px solid var(--border-color)",
                        color: "var(--info)",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {rm.language || "javascript"}
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      margin: 0,
                      minHeight: "34px",
                      lineHeight: 1.4,
                    }}
                  >
                    {rm.description || "Dedicated pair programming workspace."}
                  </p>

                  {/* Avatar stack + owner */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      paddingTop: "10px",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    {/* Avatar stack */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {visibleAvatars.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            marginLeft: i > 0 ? "-8px" : 0,
                            border: "2px solid var(--bg-panel)",
                            borderRadius: "7px",
                            zIndex: 10 - i,
                          }}
                        >
                          <UserAvatar
                            user={m.user}
                            size={22}
                            radius="5px"
                            bordered={false}
                          />
                        </div>
                      ))}
                      {remaining > 0 && (
                        <div
                          style={{
                            marginLeft: "-8px",
                            width: "22px",
                            height: "22px",
                            borderRadius: "5px",
                            backgroundColor: "var(--bg-subpanel)",
                            border: "2px solid var(--bg-panel)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "9px",
                            fontWeight: 700,
                            color: "var(--text-dim)",
                            zIndex: 0,
                          }}
                        >
                          +{remaining}
                        </div>
                      )}
                    </div>

                    {/* Member count */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11px",
                        color: "var(--text-dim)",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Users size={12} />
                      <span>
                        {members.length || 1} Operator
                        {(members.length || 1) === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* Open/Preview */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "var(--accent)",
                        fontWeight: 600,
                        fontSize: "11px",
                        flexShrink: 0,
                      }}
                    >
                      <span>{isMember ? "Open" : "Preview"}</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE ROOM MODAL — unchanged */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "440px",
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-main)",
                }}
              >
                Deploy Collaborative Cockpit
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "var(--danger)",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleCreateRoom}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "var(--text-muted)",
                  }}
                >
                  ROOM TITLE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. backend-refactor-sprint"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  style={{
                    backgroundColor: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    color: "var(--text-main)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "var(--text-muted)",
                  }}
                >
                  DESCRIPTION
                </label>
                <input
                  type="text"
                  placeholder="Goals or pairing context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    backgroundColor: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    color: "var(--text-main)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "var(--text-muted)",
                  }}
                >
                  CONTAINER RUNTIME
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    backgroundColor: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    color: "var(--text-main)",
                    outline: "none",
                  }}
                >
                  <option value="javascript">JavaScript (Node 22)</option>
                  <option value="typescript">TypeScript (TSX)</option>
                  <option value="python">Python (3.13)</option>
                  <option value="rust">Rust (1.88)</option>
                  <option value="go">Go (1.24)</option>
                </select>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span>Private room (requires owner approval to join)</span>
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    padding: "6px 14px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    padding: "6px 16px",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: creating ? "not-allowed" : "pointer",
                    boxShadow: "0 0 12px var(--accent-glow)",
                  }}
                >
                  {creating ? "Initializing..." : "Deploy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}