// client/src/features/chat/components/BotPickerModal.jsx
import React, { useState } from "react";
import { X, Sparkles, Plus, Check, Trash2 } from "lucide-react";

const PRESETS = [
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    provider: "groq",
    instructions:
      "You are a strict but fair code reviewer. Point out bugs, anti-patterns, and edge cases. Be concise.",
  },
  {
    id: "explainer",
    name: "Explainer",
    provider: "groq",
    instructions:
      "You explain code and concepts clearly for junior developers. Use short examples.",
  },
  {
    id: "rubber-duck",
    name: "Rubber Duck",
    provider: "groq",
    instructions:
      "You are a rubber duck. Ask clarifying questions to help the user think through problems. Do not solve for them.",
  },
  {
    id: "tester",
    name: "Test Writer",
    provider: "groq",
    instructions:
      "You suggest test cases and edge cases for the code shown. Output tests in the language of the snippet.",
  },
  {
    id: "refactor",
    name: "Refactorer",
    provider: "groq",
    instructions:
      "You suggest refactors that improve readability and performance. Show the before and after.",
  },
  {
    id: "summarizer",
    name: "Summarizer",
    provider: "groq",
    instructions:
      "You summarize long discussions into 3-5 bullet points. Keep it neutral.",
  },
];

// ── Reset global button styles inside this modal ─────────────
const resetBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  background: "transparent",
  border: "none",
  borderRadius: 0,
  padding: 0,
  margin: 0,
  color: "inherit",
  fontFamily: "inherit",
  fontSize: "inherit",
  fontWeight: "inherit",
  lineHeight: 1,
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  width: "auto",
  height: "auto",
  minHeight: 0,
  minWidth: 0,
  whiteSpace: "normal",
  transition: "none",
};

export const BotPickerModal = ({
  isOpen,
  onClose,
  existingBots = [],
  onAdd,
  onRemove,
  mode = "create",
}) => {
  const [selected, setSelected] = useState([]);
  const [customName, setCustomName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  const existingNames = new Set(
    existingBots.map((b) => b.name.toLowerCase())
  );

  const togglePreset = (preset) => {
    setSelected((prev) =>
      prev.some((p) => p.id === preset.id)
        ? prev.filter((p) => p.id !== preset.id)
        : [...prev, preset]
    );
  };

  const handleAdd = async () => {
    if (adding) return;
    if (selected.length === 0 && !customName.trim()) return;

    setAdding(true);
    try {
      for (const preset of selected) {
        await onAdd({
          name: preset.name,
          provider: preset.provider,
          instructions: preset.instructions,
        });
      }
      if (customName.trim()) {
        await onAdd({
          name: customName.trim(),
          provider: "groq",
          instructions: customInstructions.trim(),
        });
      }
      setSelected([]);
      setCustomName("");
      setCustomInstructions("");
      if (mode !== "manage") onClose();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (botId) => {
    if (!onRemove || !botId) return;
    await onRemove(botId);
  };

  const canSubmit =
    !adding && (selected.length > 0 || customName.trim().length > 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "85vh",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ─────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
            }}
          >
            <Sparkles size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "var(--text-main)",
                letterSpacing: "0.06em",
                lineHeight: 1,
              }}
            >
              {mode === "manage" ? "MANAGE BOTS" : "ADD AI BOTS"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              ...resetBtn,
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              color: "var(--text-dim)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-dim)";
            }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── BODY ───────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Existing bots (manage mode) */}
          {mode === "manage" && existingBots.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                }}
              >
                IN THIS DISCUSSION
              </div>
              {existingBots.map((bot) => (
                <div
                  key={bot.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "8px 10px",
                    backgroundColor: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <Sparkles
                      size={12}
                      color="var(--accent)"
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--text-main)",
                          lineHeight: 1.2,
                        }}
                      >
                        {bot.name}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: "var(--text-dim)",
                          lineHeight: 1.3,
                          marginTop: "2px",
                        }}
                      >
                        {bot.provider}
                        {bot.model ? ` · ${bot.model}` : ""}
                      </div>
                    </div>
                  </div>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemove(bot.id)}
                      style={{
                        ...resetBtn,
                        gap: "4px",
                        padding: "4px 8px",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "var(--danger)",
                        borderRadius: "4px",
                        fontSize: "10px",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(239, 68, 68, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Trash2 size={10} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Presets label */}
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-dim)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              lineHeight: 1,
            }}
          >
            {mode === "manage" ? "ADD A PRESET" : "PRESETS"}
          </div>

          {/* Presets grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {PRESETS.map((preset) => {
              const isSelected = selected.some((p) => p.id === preset.id);
              const alreadyAdded = existingNames.has(
                preset.name.toLowerCase()
              );
              const disabled = alreadyAdded;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => !disabled && togglePreset(preset)}
                  disabled={disabled}
                  style={{
                    ...resetBtn,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    gap: "4px",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${
                      isSelected ? "var(--accent)" : "var(--border-color)"
                    }`,
                    backgroundColor: isSelected
                      ? "var(--bg-active)"
                      : "var(--bg-subpanel)",
                    color: "var(--text-main)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    position: "relative",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.borderColor =
                        "var(--border-color)";
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: "var(--text-main)",
                    }}
                  >
                    {preset.name}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      color: "var(--text-dim)",
                      lineHeight: 1.35,
                      width: "100%",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {preset.instructions}
                  </div>

                  {/* Selection checkmark */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                      }}
                    >
                      <Check size={12} color="var(--accent)" />
                    </div>
                  )}
                  {alreadyAdded && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        fontSize: "8px",
                        color: "var(--text-dim)",
                        fontWeight: 700,
                      }}
                    >
                      ADDED
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom bot label */}
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-dim)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              lineHeight: 1,
              marginTop: "4px",
            }}
          >
            CUSTOM BOT
          </div>

          <input
            type="text"
            placeholder="Bot name (e.g. Backend Helper)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            maxLength={60}
            style={{
              width: "100%",
              boxSizing: "border-box",
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "8px 10px",
              fontSize: "11px",
              color: "var(--text-main)",
              outline: "none",
              fontFamily: "monospace",
              height: "34px",
            }}
          />

          <textarea
            placeholder="Instructions (e.g. You help write tests for Node.js code)"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            maxLength={500}
            rows={2}
            style={{
              width: "100%",
              boxSizing: "border-box",
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "8px 10px",
              fontSize: "11px",
              color: "var(--text-main)",
              outline: "none",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
        </div>

        {/* ── FOOTER ─────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-dim)",
              lineHeight: 1,
            }}
          >
            {selected.length} preset
            {selected.length === 1 ? "" : "s"} selected
            {customName.trim() ? " + 1 custom" : ""}
          </div>

          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...resetBtn,
                padding: "6px 14px",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                borderRadius: "4px",
                fontSize: "11px",
                height: "30px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {mode === "manage" ? "Done" : "Cancel"}
            </button>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canSubmit}
              style={{
                ...resetBtn,
                gap: "6px",
                padding: "6px 16px",
                border: "1px solid var(--accent)",
                backgroundColor: "var(--accent)",
                color: "#ffffff",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 700,
                height: "30px",
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              <Plus size={12} />
              <span>
                {adding
                  ? "Adding…"
                  : mode === "manage"
                  ? "Add Selected"
                  : "Add Bots"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotPickerModal;