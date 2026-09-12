// mobile/src/app/(tabs)/index.tsx
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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Search, X, Home, User as UserIcon } from "lucide-react-native";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useFluxTheme } from "../../context/ThemeContext";
import { RoomCard } from "../../components/RoomCard";

export default function RoomsTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useFluxTheme();
  const currentUserId = String(user?._id || user?.id || "");

  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ---- Fetch my rooms ---- */
  const loadRooms = useCallback(async () => {
    try {
      const data = await apiRequest("/rooms");
      setMyRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[rooms] load failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* Refresh on every focus (e.g. when returning from a workspace). */
  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  /* ---- Debounced search ---- */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await apiRequest(`/rooms/search?q=${encodeURIComponent(q)}`);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[rooms] search failed:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  /* ---- Derived ---- */
  const isSearchMode = searchResults !== null;
  const displayed = useMemo(() => {
    return isSearchMode ? searchResults || [] : myRooms;
  }, [isSearchMode, searchResults, myRooms]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.greetingRow}>
        <UserIcon size={16} color={colors.accent} />
        <Text style={[styles.greeting, { color: colors.textMain }]}>
          {user?.username || "Operator"}
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {isSearchMode
          ? `${displayed.length} public room${displayed.length === 1 ? "" : "s"} found`
          : `${myRooms.length} room${myRooms.length === 1 ? "" : "s"} in your mesh`}
      </Text>

      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.bgPanel, borderColor: colors.border },
        ]}
      >
        <Search size={14} color={colors.textDim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search public rooms..."
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.textMain }]}
        />
        {searching && <ActivityIndicator size="small" color={colors.textDim} />}
        {!!query && !searching && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <X size={14} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RoomCard
              room={item}
              onPress={() => router.push(`/workspace/${item._id}` as any)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Home size={36} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                {isSearchMode ? "No matching rooms" : "No rooms yet"}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                {isSearchMode
                  ? "Try a different search."
                  : "Ask a teammate to invite you, or search for a public room above."}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 12 },
  header: { gap: 8, marginBottom: 8 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  greeting: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyHint: { fontSize: 12, textAlign: "center", paddingHorizontal: 30, lineHeight: 17 },
});