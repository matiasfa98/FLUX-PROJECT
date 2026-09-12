// mobile/src/app/conversation/[conversationId].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Send, Sparkles, Plus, Users, MessageSquare, Hash } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useFluxTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { BotPickerModal } from "../../components/BotPickerModal";

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { colors } = useFluxTheme();
  const currentUserId = String(user?._id || user?.id || "");

  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingBots, setTypingBots] = useState<Record<string, string>>({});
  const [showBotPicker, setShowBotPicker] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const socket = getSocket();

  /* ---------- Load ---------- */
  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const [convRes, msgsRes] = await Promise.all([
        apiRequest(`/chat/conversations/${conversationId}`),
        apiRequest(`/chat/conversations/${conversationId}/messages?limit=50`),
      ]);
      setConversation(convRes.conversation);
      setMessages(msgsRes.messages || []);

      apiRequest(`/chat/conversations/${conversationId}/read`, {
        method: "POST",
      }).catch(() => {});
    } catch (err) {
      console.error("[conversation] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- Socket ---------- */
  useEffect(() => {
    if (!socket || !conversationId) return;

    const onJoin = () => {
      socket.emit("conversation:join", { conversationId });
    };

    const onMessage = (msg: any) => {
      if (!msg) return;
      if (String(msg.conversationId) !== String(conversationId)) return;
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onRead = (payload: any) => {
      if (String(payload.conversationId) !== String(conversationId)) return;
      // No-op for now — we could show read ticks
    };

    const onBotTyping = (payload: any) => {
      if (String(payload.conversationId) !== String(conversationId)) return;
      setTypingBots((prev) => {
        const next = { ...prev };
        if (payload.isTyping) {
          next[String(payload.botId)] = payload.botName;
        } else {
          delete next[String(payload.botId)];
        }
        return next;
      });
    };

    const onBotAdded = (payload: any) => {
      if (String(payload.conversationId) !== String(conversationId)) return;
      setConversation((c: any) =>
        c ? { ...c, bots: [...(c.bots || []), payload.bot] } : c
      );
    };

    const onBotRemoved = (payload: any) => {
      if (String(payload.conversationId) !== String(conversationId)) return;
      setConversation((c: any) =>
        c
          ? {
              ...c,
              bots: (c.bots || []).filter((b: any) => b.id !== payload.botId),
            }
          : c
      );
    };

    socket.on("connect", onJoin);
    socket.on("chat:message", onMessage);
    socket.on("chat:read", onRead);
    socket.on("chat:bot-typing", onBotTyping);
    socket.on("discussion:bot-added", onBotAdded);
    socket.on("discussion:bot-removed", onBotRemoved);

    if (socket.connected) onJoin();

    return () => {
      socket.off("connect", onJoin);
      socket.off("chat:message", onMessage);
      socket.off("chat:read", onRead);
      socket.off("chat:bot-typing", onBotTyping);
      socket.off("discussion:bot-added", onBotAdded);
      socket.off("discussion:bot-removed", onBotRemoved);
      socket.emit("conversation:leave", { conversationId });
    };
  }, [socket, conversationId]);

  /* ---------- Auto-scroll ---------- */
  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      50
    );
    return () => clearTimeout(t);
  }, [messages.length, Object.keys(typingBots).length]);

  /* ---------- Send ---------- */
  const handleSend = () => {
    const text = input.trim();
    if (!text || !socket || !conversationId) return;
    socket.emit("chat:send", { conversationId, text });
    setInput("");
  };

  /* ---------- Bots ---------- */
  const handleAddBot = (bot: any) => {
    if (!socket || !conversationId) return;
    socket.emit("discussion:add-bot", { conversationId, bot });
    setShowBotPicker(false);
  };

  const handleRemoveBot = (botId: string) => {
    if (!socket || !conversationId) return;
    socket.emit("discussion:remove-bot", { conversationId, botId });
  };

  /* ---------- Derived ---------- */
  const isDiscussion =
    conversation?.type === "discussion" || conversation?.type === "group";
  const bots = conversation?.bots || [];
  const typingNames = Object.values(typingBots);

  const peerLabel = useMemo(() => {
    if (!conversation) return "";
    if (isDiscussion) return conversation.name || "Discussion";
    if (conversation.type === "room") return conversation.room?.name || "Room";
    const peer = conversation.participants?.find(
      (p: any) => String(p.id) !== currentUserId
    );
    return peer?.username || "Direct message";
  }, [conversation, isDiscussion, currentUserId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgMain }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: peerLabel,
          headerStyle: { backgroundColor: colors.bgPanel },
          headerTintColor: colors.textMain,
          headerTitleStyle: { fontSize: 14, fontWeight: "700" },
          headerRight: isDiscussion
            ? () => (
                <TouchableOpacity
                  onPress={() => setShowBotPicker(true)}
                  style={{ paddingHorizontal: 12 }}
                >
                  <Sparkles size={18} color={colors.accent} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.container, { backgroundColor: colors.bgMain }]}
        keyboardVerticalOffset={90}
      >
        {/* Bot chips row (discussions only) */}
        {isDiscussion && bots.length > 0 && (
          <View
            style={[
              styles.botBar,
              {
                backgroundColor: colors.bgSubpanel,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {bots.map((b: any) => (
                  <View
                    key={b.id}
                    style={[
                      styles.botChip,
                      {
                        backgroundColor: "rgba(99, 102, 241, 0.12)",
                        borderColor: colors.accent,
                      },
                    ]}
                  >
                    <Sparkles size={10} color={colors.accent} />
                    <Text
                      style={[styles.botChipText, { color: colors.accent }]}
                    >
                      {b.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveBot(b.id)}
                      hitSlop={8}
                    >
                      <Text style={{ color: colors.accent, fontSize: 12 }}>
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Messages */}
        <ScrollView ref={scrollRef} contentContainerStyle={styles.feed}>
          {messages.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textDim }]}>
              {isDiscussion
                ? "No messages yet. Say hi, or mention a bot with @BotName."
                : "No messages yet."}
            </Text>
          ) : (
            messages.map((msg, i) => {
              const isBot = Boolean(msg.senderBot);
              const isMe =
                !isBot &&
                (msg.sender?.id === currentUserId ||
                  msg.senderId === currentUserId);
              const name = isBot
                ? msg.senderBot?.name
                : msg.sender?.username || msg.senderName || "Operator";

              return (
                <View
                  key={msg.id || msg._id || i}
                  style={[
                    styles.bubbleWrap,
                    { alignItems: isMe ? "flex-end" : "flex-start" },
                  ]}
                >
                  {!isMe && (
                    <View style={styles.senderRow}>
                      {isBot && <Sparkles size={10} color={colors.accent} />}
                      <Text
                        style={[
                          styles.sender,
                          { color: isBot ? colors.accent : colors.textDim },
                        ]}
                      >
                        {isBot ? `🤖 ${name}` : name}
                      </Text>
                      {isBot && msg.senderBot?.model && (
                        <Text
                          style={[
                            styles.modelTag,
                            {
                              color: colors.textDim,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          {msg.senderBot.provider} · {msg.senderBot.model}
                        </Text>
                      )}
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isBot
                        ? {
                            backgroundColor: "rgba(99, 102, 241, 0.08)",
                            borderColor: colors.accent,
                            borderWidth: 1,
                          }
                        : isMe
                        ? { backgroundColor: colors.accent }
                        : {
                            backgroundColor: colors.bgPanel,
                            borderColor: colors.border,
                            borderWidth: 1,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: isMe ? "#fff" : colors.textMain },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {typingNames.length > 0 && (
            <View style={styles.typingRow}>
              <Sparkles size={11} color={colors.accent} />
              <Text style={[styles.typingText, { color: colors.accent }]}>
                {typingNames.join(", ")}{" "}
                {typingNames.length === 1 ? "is" : "are"} thinking…
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.bgPanel, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message"
            placeholderTextColor={colors.textDim}
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSubpanel,
                borderColor: colors.border,
                color: colors.textMain,
              },
            ]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: input.trim() ? colors.accent : colors.bgSubpanel,
              },
            ]}
          >
            <Send size={14} color={input.trim() ? "#fff" : colors.textDim} />
          </TouchableOpacity>
        </View>

        {isDiscussion && (
          <BotPickerModal
            isOpen={showBotPicker}
            onClose={() => setShowBotPicker(false)}
            existingBots={bots}
            onAdd={handleAddBot}
            onRemove={handleRemoveBot}
          />
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  botBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  botChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  botChipText: { fontSize: 10, fontWeight: "700" },
  feed: { padding: 12, gap: 10, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: 40, fontSize: 12, lineHeight: 18 },
  bubbleWrap: { gap: 3, maxWidth: "85%" },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: 6 },
  sender: { fontSize: 10, fontWeight: "700" },
  modelTag: {
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  bubble: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  typingText: { fontSize: 11, fontStyle: "italic" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});