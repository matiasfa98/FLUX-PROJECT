// client/src/features/workspace/components/AttachmentPreview.jsx
import React, { useState } from "react";
import {
  FileText,
  Download,
  Image as ImageIcon,
  FileArchive,
  Film,
  Music,
  Code,
  ExternalLink,
  X,
} from "lucide-react";

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const classify = (mimeType = "", filename = "") => {
  const mime = mimeType.toLowerCase();
  const ext = (filename.split(".").pop() || "").toLowerCase();

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return "image";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv"].includes(ext))
    return "video";
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext))
    return "audio";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("rar") ||
    ["zip", "tar", "gz", "rar", "7z"].includes(ext)
  )
    return "archive";
  if (
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.startsWith("text/") ||
    ["js", "jsx", "ts", "tsx", "py", "go", "rs", "java", "c", "cpp", "h", "json", "md", "txt", "yml", "yaml"].includes(ext)
  )
    return "code";
  return "file";
};

const iconFor = (kind) => {
  switch (kind) {
    case "image": return ImageIcon;
    case "video": return Film;
    case "audio": return Music;
    case "pdf": return FileText;
    case "archive": return FileArchive;
    case "code": return Code;
    default: return FileText;
  }
};

/*
|--------------------------------------------------------------------------
| IMAGE LIGHTBOX
|--------------------------------------------------------------------------
*/
const ImageLightbox = ({ url, alt, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.9)",
      zIndex: 10000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      cursor: "zoom-out",
    }}
  >
    <button
      onClick={onClose}
      style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#fff",
        borderRadius: "6px",
        padding: "6px 10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
      }}
    >
      <X size={12} /> Close
    </button>
    <img
      src={url}
      alt={alt}
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: "95vw",
        maxHeight: "95vh",
        objectFit: "contain",
        borderRadius: "8px",
        cursor: "default",
      }}
    />
  </div>
);

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/
export const AttachmentPreview = ({ attachment }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!attachment?.url) return null;

  const kind = classify(attachment.mimeType, attachment.originalName);
  const Icon = iconFor(kind);
  const sizeLabel = formatSize(attachment.size);

  // ── IMAGE ────────────────────────────────────────────────
  if (kind === "image") {
    return (
      <>
        <div
          style={{
            marginTop: "6px",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid var(--border-color)",
            maxWidth: "320px",
            backgroundColor: "var(--bg-panel)",
            cursor: "zoom-in",
          }}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={attachment.url}
            alt={attachment.originalName}
            loading="lazy"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: "320px",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              padding: "6px 10px",
              fontSize: "10px",
              color: "var(--text-muted)",
              backgroundColor: "var(--bg-panel)",
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {attachment.originalName}
            </span>
            <span style={{ flexShrink: 0 }}>{sizeLabel}</span>
          </div>
        </div>

        {lightboxOpen && (
          <ImageLightbox
            url={attachment.url}
            alt={attachment.originalName}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  // ── VIDEO ────────────────────────────────────────────────
  if (kind === "video") {
    return (
      <div
        style={{
          marginTop: "6px",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1px solid var(--border-color)",
          maxWidth: "360px",
          backgroundColor: "#000",
        }}
      >
        <video
          src={attachment.url}
          controls
          preload="metadata"
          playsInline
          style={{
            display: "block",
            width: "100%",
            maxHeight: "280px",
            backgroundColor: "#000",
          }}
        />
        <div
          style={{
            padding: "6px 10px",
            fontSize: "10px",
            color: "var(--text-muted)",
            backgroundColor: "var(--bg-panel)",
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            🎬 {attachment.originalName}
          </span>
          <span style={{ flexShrink: 0 }}>{sizeLabel}</span>
        </div>
      </div>
    );
  }

  // ── AUDIO ────────────────────────────────────────────────
  if (kind === "audio") {
    return (
      <div
        style={{
          marginTop: "6px",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-panel)",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11px",
            color: "var(--text-main)",
          }}
        >
          <Music size={14} color="var(--accent)" />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {attachment.originalName}
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>
            {sizeLabel}
          </span>
        </div>
        <audio
          src={attachment.url}
          controls
          preload="metadata"
          style={{ width: "100%" }}
        />
      </div>
    );
  }

  // ── PDF ──────────────────────────────────────────────────
  if (kind === "pdf") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "6px",
          padding: "10px 12px",
          borderRadius: "10px",
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "var(--text-main)",
          textDecoration: "none",
          maxWidth: "320px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FileText size={18} color="var(--danger)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {attachment.originalName}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
            PDF · {sizeLabel}
          </div>
        </div>
        <ExternalLink size={14} color="var(--text-dim)" />
      </a>
    );
  }

  // ── EVERYTHING ELSE (code, archive, generic file) ────────
  const accentColor =
    kind === "code"
      ? "var(--info)"
      : kind === "archive"
      ? "var(--warning)"
      : "var(--accent)";

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.originalName}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "6px",
        padding: "8px 12px",
        backgroundColor: "var(--bg-subpanel)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        color: "var(--text-main)",
        textDecoration: "none",
        maxWidth: "320px",
      }}
    >
      <Icon size={18} color={accentColor} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {attachment.originalName}
        </div>
        <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "2px" }}>
          {sizeLabel}
        </div>
      </div>
      <Download size={12} color="var(--text-dim)" style={{ flexShrink: 0 }} />
    </a>
  );
};

export default AttachmentPreview;