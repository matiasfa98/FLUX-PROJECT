// client/src/features/user-profile/components/QrLinkModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Smartphone, Check, Loader2, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest } from "../../../lib/api";

export const QrLinkModal = ({ isOpen, onClose }) => {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("creating"); // creating | ready | claimed | expired
  const [secondsLeft, setSecondsLeft] = useState(300);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const startSession = async () => {
    setStatus("creating");
    setSession(null);
    setSecondsLeft(300);

    try {
      const data = await apiRequest("/auth/qr/create", { method: "POST" });
      setSession(data);
      setStatus("ready");
    } catch (err) {
      console.error("[qr] create failed:", err);
      setStatus("expired");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    startSession();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Countdown + poll for claim.
  useEffect(() => {
    if (!session || status !== "ready") return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStatus("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await apiRequest(`/auth/qr/status/${session.token}`);
        if (res.claimed) {
          setStatus("claimed");
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          setTimeout(() => onClose?.(), 1500);
        }
      } catch {
        // ignore transient errors
      }
    }, 1500);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, [session, status]);

  const handleCancel = async () => {
    if (session?.token) {
      try {
        await apiRequest(`/auth/qr/cancel/${session.token}`, {
          method: "DELETE",
        });
      } catch {
        // best effort
      }
    }
    onClose?.();
  };

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Smartphone size={16} color="var(--accent)" />
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--text-main)",
                letterSpacing: "0.04em",
              }}
            >
              LINK MOBILE DEVICE
            </span>
          </div>
          <button
            onClick={handleCancel}
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

        {status === "creating" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader2
              size={20}
              color="var(--accent)"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <div
              style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px" }}
            >
              Generating link code…
            </div>
          </div>
        )}

        {status === "ready" && session && (
          <>
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "16px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QRCodeSVG value={session.qrPayload} size={200} level="M" />
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              Open the Flux app on your phone and tap <strong>Link Device</strong>.
              Or enter the code manually:
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {session.code.split("").map((digit, i) => (
                <div
                  key={i}
                  style={{
                    width: "36px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "var(--text-main)",
                  }}
                >
                  {digit}
                </div>
              ))}
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: "10px",
                color: "var(--text-dim)",
              }}
            >
              Expires in {minutes}:{seconds}
            </div>
          </>
        )}

        {status === "claimed" && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid var(--online)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={22} color="var(--online)" />
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
              Device linked
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Your phone is now signed in.
            </div>
          </div>
        )}

        {status === "expired" && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--danger)", fontWeight: 700 }}>
              Session expired
            </div>
            <button
              onClick={startSession}
              style={{
                backgroundColor: "var(--accent)",
                border: "none",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={12} />
              <span>Generate new code</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QrLinkModal;