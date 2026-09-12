// mobile/src/app/(tabs)/chat.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Search,
  MessageSquare,
  Users,
  Hash,
  X,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useFluxTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../lib/api";
import { getSocket } from "../../lib/socket";

type FilterType = "all" | "dm" | "discussion" | "room";

export default function ChatTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useFluxTheme();
  const currentUserId = String(user?._id || user?.id || "");

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  /* ---------- Load inbox ---------- */
  const load = useCallback(async () => {
    try {
      const data = await apiRequest("/chat/inbox");
      setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
    } catch (err) {
      console.error("[chat] inbox load failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* ---------- Live inbox updates ---------- */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onInboxUpdated = () => {
      // Cheap approach: refetch the inbox whenever any update comes in.
      load();
    };

    socket.on("chat:inbox-updated", onInboxUpdated);
    socket.on("conversation:created", onInboxUpdated);
    socket.on("discussion:bot-added", onInboxUpdated);
    socket.on("discussion:bot-removed", onInboxUpdated);

    return () => {
      socket.off("chat:inbox-updated", onInboxUpdated);
      socket.off("conversation:created", onInboxUpdated);
      socket.off("discussion:bot-added", onInboxUpdated);
      socket.off("discussion:bot-removed", onInboxUpdated);
    };
  }, [load]);

  /* ---------- Derived list ---------- */
  const displayed = useMemo(() => {
    let list = conversations;

    if (filter !== "all") {
      list = list.filter((c) =>
        filter === "dm"
          ? c.type === "dm"
          : filter === "discussion"
          ? c.type === "discussion" || c.type === "group"
          : c.type === "room"
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => {
        const label = conversationLabel(c, currentUserId).toLowerCase();
        return label.includes(q);
      });
    }

    return list;
  }, [conversations, filter, query, currentUserId]);

  /* ---------- Render helpers ---------- */
  const renderConversation = ({ item }: { item: any }) => {
    const label = conversationLabel(item, currentUserId);
    const sublabel = conversationSublabel(item, currentUserId);
    const Icon = iconFor(item);
    const unread = item.unreadCount || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push(`/conversation/${item.id}` as any)}
        style={[
          styles.convRow,
          {
            backgroundColor: colors.bgMain,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.convIcon,
            { backgroundColor: colors.bgSubpanel, borderColor: colors.border },
          ]}
        >
          <Icon size={16} color={colors.accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.convTitleRow}>
            <Text
              numberOfLines={1}
              style={[styles.convTitle, { color: colors.textMain }]}
            >
              {label}
            </Text>
            {unread > 0 && (
              <View
                style={[styles.unreadBadge, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.unreadText}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            )}
          </View>
          <Text
            numberOfLines={1}
            style={[styles.convPreview, { color: colors.textDim }]}
          >
            {item.lastMessagePreview || sublabel || "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMain }]}>
          Conversations
        </Text>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.bgPanel, borderColor: colors.border },
        ]}
      >
        <Search size={13} color={colors.textDim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textDim}
          style={[styles.searchInput, { color: colors.textMain }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <X size={13} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(["all", "dm", "discussion", "room"] as FilterType[]).map((f) => {
          const active = filter === f;
          const label =
            f === "all"
              ? "All"
              : f === "dm"
              ? "DMs"
              : f === "discussion"
              ? "Groups"
              : "Rooms";
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.bgActive : "transparent",
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.textMain : colors.textDim },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(c) => c.id}
          renderItem={renderConversation}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MessageSquare size={36} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                No conversations
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                {query
                  ? "No conversations match your search."
                  : "Start a discussion or DM from a room's Chat tab."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/* ---------- Helpers ---------- */

function conversationLabel(conv: any, currentUserId: string): string {
  if (conv.type === "discussion" || conv.type === "group")
    return conv.name || "Discussion";
  if (conv.type === "room") return conv.room?.name || "Room";
  const peer = conv.participants?.find((p: any) => String(p.id) !== currentUserId);
  return peer?.username || "Direct message";
}

function conversationSublabel(conv: any, currentUserId: string): string {
  if (conv.type === "dm") return "Direct message";
  if (conv.type === "discussion" || conv.type === "group") {
    const count = conv.participants?.length || 0;
    const bots = conv.bots?.length || 0;
    return `${count} member${count === 1 ? "" : "s"}${bots ? ` · ${bots} bot${bots === 1 ? "" : "s"}` : ""}`;
  }
  if (conv.type === "room") return "Room conversation";
  return "";
}

function iconFor(conv: any) {
  if (conv.type === "discussion" || conv.type === "group") return Users;
  if (conv.type === "room") return Hash;
  return MessageSquare;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterText: { fontSize: 11, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  convIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  convTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  convTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  convPreview: { fontSize: 12, marginTop: 3 },
  unreadBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyHint: { fontSize: 12, textAlign: "center", lineHeight: 17 },
});