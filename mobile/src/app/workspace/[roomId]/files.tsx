// mobile/src/app/workspace/[roomId]/files.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Eye, Crown } from "lucide-react-native";
import { useFluxTheme } from "../../../context/ThemeContext";
import { useWorkspaceSocket } from "../../../hooks/useWorkspaceSocket";
import { FileTreeItem } from "../../../components/FileTreeItem";
import CodeViewer from "../../../components/CodeViewer";

type ViewMode = "tree" | "code";

export default function FilesTab() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { colors } = useFluxTheme();
  const ws = useWorkspaceSocket(roomId || null);
  const [mode, setMode] = useState<ViewMode>("tree");

  const rootNodes = ws.fileTree.filter((n) => !n.parent);
  const activeFile = ws.activeFileId ? ws.files[ws.activeFileId] : null;

  const handleSelectFile = () => {
    setMode("code");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgMain }]}>
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: colors.bgPanel,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.statusLeft}>
          <Crown size={12} color={colors.online} />
          <Text
            style={[styles.statusText, { color: colors.textMain }]}
            numberOfLines={1}
          >
            {ws.driver?.username || "No driver"}
          </Text>
        </View>
        <View
          style={[
            styles.readOnlyPill,
            {
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              borderColor: "rgba(245, 158, 11, 0.4)",
            },
          ]}
        >
          <Eye size={10} color={colors.warning} />
          <Text style={[styles.readOnlyText, { color: colors.warning }]}>
            READ ONLY
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.toggleBar,
          {
            backgroundColor: colors.bgPanel,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            mode === "tree" && { backgroundColor: colors.bgActive },
          ]}
          onPress={() => setMode("tree")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: mode === "tree" ? colors.textMain : colors.textDim },
            ]}
          >
            Files
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            mode === "code" && { backgroundColor: colors.bgActive },
          ]}
          onPress={() => setMode("code")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: mode === "code" ? colors.textMain : colors.textDim },
            ]}
            numberOfLines={1}
          >
            {activeFile?.name || "Code"}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "tree" ? (
        <ScrollView contentContainerStyle={styles.treeContent}>
          {rootNodes.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textDim }]}>
                No files yet. The driver hasn't created any.
              </Text>
            </View>
          ) : (
            rootNodes.map((node) => (
              <FileTreeItem
                key={node._id}
                node={node}
                fileTree={ws.fileTree}
                depth={0}
                activeFileId={ws.activeFileId}
                onSelectFile={handleSelectFile}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {!activeFile ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.emptyText, { color: colors.textDim }]}>
                Waiting for the driver to open a file…
              </Text>
            </View>
          ) : (
            <CodeViewer
              content={activeFile.content || ""}
              language={activeFile.language || ws.activeLanguage}
              filename={activeFile.name}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  statusText: { fontSize: 12, fontWeight: "700", flex: 1 },
  readOnlyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  readOnlyText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  toggleBar: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderBottomWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleText: { fontSize: 12, fontWeight: "700" },
  treeContent: { paddingVertical: 8 },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});