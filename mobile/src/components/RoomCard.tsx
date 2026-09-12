// mobile/src/components/RoomCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Lock, Globe, Users, ChevronRight } from "lucide-react-native";
import { useFluxTheme } from "../context/ThemeContext";

export const RoomCard = ({ room, onPress }: { room: any; onPress: () => void }) => {
  const { colors } = useFluxTheme();
  const isPrivate = room.settings?.access === "private";
  const members = room.members?.length || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.bgPanel, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        {isPrivate ? (
          <Lock size={14} color={colors.warning} />
        ) : (
          <Globe size={14} color={colors.online} />
        )}
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.textMain }]}
        >
          {room.name}
        </Text>
        <View
          style={[
            styles.langTag,
            {
              backgroundColor: colors.bgSubpanel,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.langText, { color: colors.info }]}>
            {(room.language || "javascript").toUpperCase()}
          </Text>
        </View>
      </View>

      {room.description ? (
        <Text
          numberOfLines={2}
          style={[styles.desc, { color: colors.textMuted }]}
        >
          {room.description}
        </Text>
      ) : (
        <Text style={[styles.desc, { color: colors.textDim }]}>
          Dedicated pair-programming workspace.
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <Users size={12} color={colors.textDim} />
          <Text style={[styles.metaText, { color: colors.textDim }]}>
            {members} {members === 1 ? "member" : "members"}
          </Text>
        </View>
        <View style={styles.openRow}>
          <Text style={[styles.openText, { color: colors.accent }]}>
            Open
          </Text>
          <ChevronRight size={14} color={colors.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  langTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  langText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 11 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  openText: { fontSize: 11, fontWeight: "700" },
});

export default RoomCard;