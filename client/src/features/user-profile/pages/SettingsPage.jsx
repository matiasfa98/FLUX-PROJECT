// client/src/features/user-profile/pages/SettingsPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Smartphone,
  Sun,
  Moon,
  LogOut,
  Shield,
  Trash2,
  Check,
  AlertCircle,
  Key,
  Palette,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { apiRequest } from "../../../lib/api";
import { QrLinkModal } from "../components/QrLinkModal";
import { ProfileSection } from "../components/ProfileSection";

const Section = ({ title, icon: Icon, children }) => (
  <section
    style={{
      backgroundColor: "var(--bg-panel)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      overflow: "hidden",
      marginBottom: "20px",
    }}
  >
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-subpanel)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {Icon && <Icon size={14} color="var(--accent)" />}
      <span
        style={{
          fontSize: "11px",
          fontWeight: 800,
          color: "var(--text-main)",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "16px" }}>{children}</div>
  </section>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [showQrModal, setShowQrModal] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

    try {
      await apiRequest("/auth/me", { method: "DELETE" });
      logout();
      navigate("/");
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to delete account",
      });
    }
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        backgroundColor: "var(--bg-main)",
        color: "var(--text-main)",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "32px 24px 60px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Operator Settings
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            Manage your account, appearance, and linked devices.
          </p>
        </div>

        {/* Feedback banner (used by delete-account errors) */}
        {feedback && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              marginBottom: "20px",
              borderRadius: "6px",
              backgroundColor:
                feedback.type === "success"
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${
                feedback.type === "success" ? "var(--online)" : "var(--danger)"
              }`,
              color:
                feedback.type === "success" ? "var(--online)" : "var(--danger)",
              fontSize: "11px",
            }}
          >
            {feedback.type === "success" ? (
              <Check size={13} />
            ) : (
              <AlertCircle size={13} />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* PROFILE */}
        <Section title="PROFILE" icon={User}>
          <ProfileSection user={user} onUpdate={updateUser} />
        </Section>

        {/* APPEARANCE */}
        <Section title="APPEARANCE" icon={Palette}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                }}
              >
                Theme
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  marginTop: "2px",
                }}
              >
                Currently using {theme} mode
              </div>
            </div>

            <button
              onClick={toggleTheme}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {theme === "dark" ? (
                <>
                  <Sun size={14} color="#f59e0b" />
                  <span>Switch to Light</span>
                </>
              ) : (
                <>
                  <Moon size={14} color="#4f46e5" />
                  <span>Switch to Dark</span>
                </>
              )}
            </button>
          </div>
        </Section>

        {/* LINKED DEVICES */}
        <Section title="LINKED DEVICES" icon={Smartphone}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                }}
              >
                Mobile App
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  marginTop: "2px",
                  lineHeight: 1.4,
                }}
              >
                Scan a QR code from your phone to sign in on the Flux mobile app.
              </div>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--accent)",
                border: "none",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <Smartphone size={12} />
              <span>Link Device</span>
            </button>
          </div>
        </Section>

        {/* SECURITY */}
        <Section title="SECURITY" icon={Shield}>
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "var(--bg-subpanel)",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              fontSize: "11px",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "4px",
                color: "var(--text-main)",
                fontWeight: 700,
              }}
            >
              <Key size={12} />
              <span>JWT Authentication</span>
            </div>
            Your session is secured with a JSON Web Token. Tokens expire after 7 days
            and are stored locally on each device. Signing out invalidates the token
            on this device only.
          </div>
        </Section>

        {/* SESSION */}
        <Section title="SESSION" icon={LogOut}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                }}
              >
                Sign out of this device
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  marginTop: "2px",
                }}
              >
                You'll need to sign in again to access your rooms.
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "transparent",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "var(--danger)",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
        </Section>

        {/* DANGER ZONE */}
        <Section title="DANGER ZONE" icon={Trash2}>
          {!showDeleteConfirm ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--danger)",
                  }}
                >
                  Delete account
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    marginTop: "2px",
                    lineHeight: 1.4,
                  }}
                >
                  Permanently deletes your account and removes you from all rooms.
                  This cannot be undone.
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "var(--danger)",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={12} />
                <span>Delete Account</span>
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--danger)",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Type DELETE to confirm:
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-subpanel)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  color: "var(--text-main)",
                  outline: "none",
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                  marginBottom: "10px",
                }}
              />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE"}
                  style={{
                    backgroundColor: "var(--danger)",
                    border: "none",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor:
                      deleteConfirmText !== "DELETE" ? "not-allowed" : "pointer",
                    opacity: deleteConfirmText !== "DELETE" ? 0.5 : 1,
                  }}
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          )}
        </Section>

        <div
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "var(--text-dim)",
            marginTop: "32px",
          }}
        >
          FLUX COCKPIT v1.0.0 · TLS VERIFIED
        </div>
      </div>

      <QrLinkModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
    </div>
  );
}