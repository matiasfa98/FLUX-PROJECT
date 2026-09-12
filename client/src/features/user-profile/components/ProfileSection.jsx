// client/src/features/user-profile/components/ProfileSection.jsx
import React, { useRef, useState, useEffect } from "react";
import { User, Camera, Loader2, Check, AlertCircle } from "lucide-react";
import { apiRequest } from "../../../lib/api";

const MAX_AVATAR_BYTES = 500_000;

const Field = ({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  textarea = false,
  hint,
}) => (
  <div style={{ marginBottom: "16px" }}>
    <label
      style={{
        display: "block",
        fontSize: "10px",
        color: "var(--text-dim)",
        fontWeight: 700,
        marginBottom: "6px",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </label>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        style={{
          width: "100%",
          backgroundColor: "var(--bg-subpanel)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "8px 12px",
          fontSize: "12px",
          color: "var(--text-main)",
          outline: "none",
          fontFamily: "inherit",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: "100%",
          backgroundColor: "var(--bg-subpanel)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "8px 12px",
          fontSize: "12px",
          color: "var(--text-main)",
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
    )}
    {hint && (
      <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "4px" }}>
        {hint}
      </div>
    )}
  </div>
);

export const ProfileSection = ({ user, onUpdate }) => {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    bio: "",
    pronouns: "",
    timezone: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username || "",
      displayName: user.displayName || "",
      bio: user.bio || "",
      pronouns: user.pronouns || "",
      timezone:
        user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
  }, [user]);

  const updateField = (key) => (value) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setFeedback({ type: "success", text: "Profile updated." });
      onUpdate?.(res.user);
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", text: "Please choose an image file." });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFeedback({ type: "error", text: "Avatar must be under 500 KB." });
      return;
    }

    setUploadingAvatar(true);
    setFeedback(null);

    try {
      const dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await apiRequest("/auth/me/avatar", {
        method: "PUT",
        body: JSON.stringify({ avatar: dataUri }),
      });
      setFeedback({ type: "success", text: "Avatar updated." });
      onUpdate?.(res.user);
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Upload failed" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await apiRequest("/auth/me/avatar", {
        method: "PUT",
        body: JSON.stringify({ avatar: "" }),
      });
      onUpdate?.(res.user);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initial = (form.displayName || form.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <form onSubmit={handleSave}>
      {/* Avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Avatar"
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "18px",
                objectFit: "cover",
                border: "1px solid var(--border-color)",
              }}
            />
          ) : (
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "18px",
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              {initial}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              position: "absolute",
              bottom: "-6px",
              right: "-6px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "var(--accent)",
              border: "2px solid var(--bg-panel)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: uploadingAvatar ? "wait" : "pointer",
              color: "#fff",
            }}
            title="Change avatar"
          >
            {uploadingAvatar ? (
              <Loader2
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Camera size={12} />
            )}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={(e) => {
              handleAvatarUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-main)",
              marginBottom: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {form.displayName || form.username || "Operator"}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-dim)",
              marginBottom: "8px",
            }}
          >
            @{form.username || "unknown"}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              Upload
            </button>
            {user?.avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--danger)",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            marginBottom: "16px",
            borderRadius: "6px",
            fontSize: "11px",
            backgroundColor:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              feedback.type === "success" ? "var(--online)" : "var(--danger)"
            }`,
            color:
              feedback.type === "success" ? "var(--online)" : "var(--danger)",
          }}
        >
          {feedback.type === "success" ? (
            <Check size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Field
          label="USERNAME"
          value={form.username}
          onChange={updateField("username")}
          maxLength={30}
          hint="Letters, numbers, _ and -"
        />
        <Field
          label="DISPLAY NAME"
          value={form.displayName}
          onChange={updateField("displayName")}
          maxLength={60}
          placeholder="Your friendly name"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Field
          label="PRONOUNS"
          value={form.pronouns}
          onChange={updateField("pronouns")}
          maxLength={20}
          placeholder="they/them"
        />
        <Field
          label="TIMEZONE"
          value={form.timezone}
          onChange={updateField("timezone")}
          maxLength={60}
        />
      </div>

      <Field
        label="BIO"
        value={form.bio}
        onChange={updateField("bio")}
        maxLength={280}
        placeholder="A short description"
        textarea
        hint={`${form.bio.length}/280`}
      />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--accent)",
            border: "none",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Check size={12} />
          )}
          <span>{saving ? "Saving…" : "Save Profile"}</span>
        </button>
      </div>
    </form>
  );
};