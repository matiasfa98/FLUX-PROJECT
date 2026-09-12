// mobile/src/components/BotPickerModal.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { X, Sparkles, Plus, Check, Trash2 } from "lucide-react-native";
import { useFluxTheme } from "../context/ThemeContext";

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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingBots?: any[];
  onAdd: (bot: any) => void | Promise<void>;
  onRemove?: (botId: string) => void;
}

export const BotPickerModal = ({
  isOpen,
  onClose,
  existingBots = [],
  onAdd,
  onRemove,
}: Props) => {
  const { colors } = useFluxTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [adding, setAdding] = useState(false);

  const existingNames = new Set(existingBots.map((b) => b.name.toLowerCase()));

  const togglePreset = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSubmit =
    !adding && (selected.length > 0 || customName.trim().length > 0);

  const handleAdd = async () => {
    if (!canSubmit) return;
    setAdding(true);
    try {
      for (const id of selected) {
        const preset = PRESETS.find((p) => p.id === id);
        if (preset) {
          await onAdd({
            name: preset.name,
            provider: preset.provider,
            instructions: preset.instructions,
          });
        }
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
      onClose();
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgPanel,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.headerLeft}>
              <Sparkles size={16} color={colors.accent} />
              <Text style={[styles.headerTitle, { color: colors.textMain }]}>
                ADD AI BOTS
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {existingBots.length > 0 && onRemove && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
                  IN THIS DISCUSSION
                </Text>
                {existingBots.map((b) => (
                  <View
                    key={b.id}
                    style={[
                      styles.existingRow,
                      {
                        backgroundColor: colors.bgSubpanel,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Sparkles size={12} color={colors.accent} />
                    <Text
                      style={[styles.existingName, { color: colors.textMain }]}
                    >
                      {b.name}
                    </Text>
                    <TouchableOpacity onPress={() => onRemove(b.id)}>
                      <Trash2 size={13} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
              PRESETS
            </Text>

            {PRESETS.map((preset) => {
              const isSelected = selected.includes(preset.id);
              const already = existingNames.has(preset.name.toLowerCase());
              const disabled = already;

              return (
                <TouchableOpacity
                  key={preset.id}
                  activeOpacity={0.85}
                  onPress={() => !disabled && togglePreset(preset.id)}
                  disabled={disabled}
                  style={[
                    styles.presetCard,
                    {
                      backgroundColor: isSelected
                        ? colors.bgActive
                        : colors.bgSubpanel,
                      borderColor: isSelected
                        ? colors.accent
                        : colors.border,
                      opacity: disabled ? 0.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.presetHeader}>
                    <Text
                      style={[styles.presetName, { color: colors.textMain }]}
                    >
                      {preset.name}
                    </Text>
                    {isSelected && <Check size={14} color={colors.accent} />}
                    {already && (
                      <Text
                        style={[
                          styles.alreadyTag,
                          { color: colors.textDim },
                        ]}
                      >
                        ADDED
                      </Text>
                    )}
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.presetDesc, { color: colors.textDim }]}
                  >
                    {preset.instructions}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
              CUSTOM BOT
            </Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Bot name (e.g. Backend Helper)"
              placeholderTextColor={colors.textDim}
              maxLength={60}
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSubpanel,
                  borderColor: colors.border,
                  color: colors.textMain,
                },
              ]}
            />
            <TextInput
              value={customInstructions}
              onChangeText={setCustomInstructions}
              placeholder="Instructions (e.g. You help write tests for Node.js)"
              placeholderTextColor={colors.textDim}
              multiline
              maxLength={500}
              style={[
                styles.input,
                styles.textarea,
                {
                  backgroundColor: colors.bgSubpanel,
                  borderColor: colors.border,
                  color: colors.textMain,
                },
              ]}
            />
          </ScrollView>

          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.btn,
                {
                  backgroundColor: "transparent",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.textMuted }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={!canSubmit}
              style={[
                styles.btn,
                {
                  backgroundColor: canSubmit
                    ? colors.accent
                    : colors.bgSubpanel,
                  borderColor: "transparent",
                },
              ]}
            >
              {adding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Plus size={13} color="#fff" />
                  <Text style={[styles.btnText, { color: "#fff" }]}>
                    Add
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  body: { padding: 16, gap: 8 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
  },
  existingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  existingName: { flex: 1, fontSize: 12, fontWeight: "700" },
  presetCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  presetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  presetName: { flex: 1, fontSize: 12, fontWeight: "700" },
  alreadyTag: { fontSize: 9, fontWeight: "800" },
  presetDesc: { fontSize: 10, lineHeight: 14 },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
  },
  textarea: { minHeight: 60, textAlignVertical: "top" },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
  },
  btnText: { fontSize: 13, fontWeight: "700" },
});

export default BotPickerModal;