// client/src/features/workspace/pages/JoinRoomPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  Loader2,
  Lock,
  Globe,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";

export default function JoinRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [pending, setPending] = useState(false);

  // -------------------------------------------------------------
  // FETCH ROOM PEEK
  // -------------------------------------------------------------
  useEffect(() => {
    async function fetchPeek() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest(`/rooms/${roomId}/peek`);
        setRoom(data);
      } catch (err) {
        setError(err.message || "Room not found or no longer available");
      } finally {
        setLoading(false);
      }
    }
    if (roomId) fetchPeek();
  }, [roomId]);

  // -------------------------------------------------------------
  // AUTO-ATTEMPT JOIN WHEN SIGNED IN
  // -------------------------------------------------------------
  //
  // If the user is already signed in, we don't make them click "Join"
  // after landing on the page — we do it automatically. If it fails,
  // we fall back to the manual button.
  //
  useEffect(() => {
  if (!isAuthenticated || !pending) return;

  const token = localStorage.getItem("flux_token") || "";
  const socketUrl =
    import.meta.env.VITE_WS_URL || "http://localhost:4000";
  const socket = io(socketUrl, { auth: { token }, transports: ["websocket"] });

  const onApproved = ({ roomId: approvedRoomId, userId }) => {
    if (
      approvedRoomId === roomId &&
      userId === String(user?._id || user?.id)
    ) {
      navigate(`/workspace/${roomId}`, { replace: true });
    }
  };

  const onRejected = ({ roomId: rejectedRoomId, userId }) => {
    if (
      rejectedRoomId === roomId &&
      userId === String(user?._id || user?.id)
    ) {
      setPending(false);
      setError("The room owner declined your request.");
    }
  };

  socket.on("room:join-approved", onApproved);
  socket.on("room:join-rejected", onRejected);

  return () => {
    socket.off("room:join-approved", onApproved);
    socket.off("room:join-rejected", onRejected);
    socket.disconnect();
  };
}, [isAuthenticated, pending, roomId, user, navigate]);

  // -------------------------------------------------------------
  // MANUAL JOIN
  // -------------------------------------------------------------
  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate("/sign-in", {
        state: { from: { pathname: `/join/${roomId}` } },
      });
      return;
    }

    setJoining(true);
    setError("");

    try {
      const res = await apiRequest(`/rooms/${roomId}/join`, {
        method: "POST",
      });

      if (res.status === "pending") {
        setPending(true);
        return;
      }

      navigate(`/workspace/${roomId}`, { replace: true });
    } catch (err) {
      const msg = (err.message || "").toLowerCase();

      if (msg.includes("already a member")) {
        navigate(`/workspace/${roomId}`, { replace: true });
        return;
      }

      if (msg.includes("pending")) {
        setPending(true);
        return;
      }

      setError(err.message || "Failed to join this room");
    } finally {
      setJoining(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--bg-main)",
        color: "var(--text-main)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "300px",
          backgroundColor: "var(--accent)",
          filter: "blur(160px)",
          opacity: 0.12,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          padding: "32px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "22px",
        }}
      >
        {/* BRAND HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--accent)", display: "flex" }}>
            <Zap size={20} />
          </span>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--text-main)",
            }}
          >
            FLUX INVITE
          </span>
        </div>

        {/* LOADING */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "32px 0",
              color: "var(--text-muted)",
              fontSize: "12px",
            }}
          >
            <Loader2
              size={16}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span>Resolving room…</span>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              padding: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              color: "var(--danger)",
              fontSize: "12px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        {/* PENDING STATE */}
        {!loading && !error && pending && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px",
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "6px",
              }}
            >
              <Clock size={18} color="var(--warning)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: "12px", lineHeight: 1.5 }}>
                <div
                  style={{
                    color: "var(--text-main)",
                    fontWeight: 700,
                    marginBottom: "2px",
                  }}
                >
                  Request pending approval
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  The room owner will review your request. You'll be redirected
                  automatically once you're approved.
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/rooms")}
              style={{
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                padding: "10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back to Lobby
            </button>
          </>
        )}

        {/* ROOM INFO + JOIN */}
        {!loading && !error && !pending && room && (
          <>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  marginBottom: "6px",
                  letterSpacing: "0.06em",
                }}
              >
                YOU'VE BEEN INVITED TO
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  lineHeight: 1.2,
                }}
              >
                {room.name}
              </div>
              {room.description && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "10px",
                    lineHeight: 1.5,
                  }}
                >
                  {room.description}
                </div>
              )}
            </div>

            {/* META ROW */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                padding: "12px 0",
                borderTop: "1px solid var(--border-color)",
                borderBottom: "1px solid var(--border-color)",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                {room.access === "private" ? (
                  <>
                    <Lock size={11} color="var(--warning)" />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <Globe size={11} color="var(--online)" />
                    <span>Public</span>
                  </>
                )}
              </span>
              <span style={{ color: "var(--border-color)" }}>•</span>
              <span>@{room.owner?.username || "unknown"}</span>
              <span style={{ color: "var(--border-color)" }}>•</span>
              <span style={{ textTransform: "uppercase" }}>
                {room.language || "javascript"}
              </span>
            </div>

            {/* JOIN BUTTON */}
            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                backgroundColor: "var(--accent)",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: joining ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 0 20px var(--accent-glow)",
                opacity: joining ? 0.7 : 1,
              }}
            >
              {joining ? (
                <>
                  <Loader2
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span>Joining…</span>
                </>
              ) : isAuthenticated ? (
                <>
                  <span>Enter Room</span>
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Sign in to Join</span>
                </>
              )}
            </button>

            {/* SIGN-IN HINT */}
            {!isAuthenticated && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                You need an operator account to enter.{" "}
                <Link
                  to="/sign-in"
                  state={{ from: { pathname: `/join/${roomId}` } }}
                  style={{
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Sign in
                </Link>{" "}
                or{" "}
                <Link
                  to="/sign-up"
                  state={{ from: { pathname: `/join/${roomId}` } }}
                  style={{
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  create an account
                </Link>
                .
              </div>
            )}

            {/* AUTHENTICATED USER HINT */}
            {isAuthenticated && user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={11} color="var(--online)" />
                <span>
                  Signing in as <strong>{user.username}</strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}