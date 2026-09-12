// mobile/src/components/FileTreeItem.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode } from "lucide-react-native";
import { useFluxTheme } from "../context/ThemeContext";
import type { FileNode } from "../hooks/useWorkspaceSocket";

interface Props {
  node: FileNode;
  fileTree: FileNode[];
  depth: number;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
}

export const FileTreeItem = ({
  node,
  fileTree,
  depth,
  activeFileId,
  onSelectFile,
}: Props) => {
  const { colors } = useFluxTheme();
  const [expanded, setExpanded] = useState(true);
  const isFolder = node.type === "folder";
  const isActive = !isFolder && String(activeFileId) === String(node._id);
  const children = isFolder
    ? fileTree.filter((n) => String(n.parent) === String(node._id))
    : [];

  const handlePress = () => {
    if (isFolder) setExpanded((e) => !e);
    else onSelectFile(node._id);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.row,
          {
            paddingLeft: 10 + depth * 14,
            backgroundColor: isActive ? colors.bgActive : "transparent",
          },
        ]}
      >
        {isFolder ? (
          <>
            {expanded ? (
              <ChevronDown size={12} color={colors.textMuted} />
            ) : (
              <ChevronRight size={12} color={colors.textMuted} />
            )}
            {expanded ? (
              <FolderOpen size={13} color={colors.accent} />
            ) : (
              <Folder size={13} color={colors.accent} />
            )}
          </>
        ) : (
          <>
            <View style={{ width: 12 }} />
            <FileCode size={13} color={colors.info} />
          </>
        )}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: isActive ? colors.textMain : colors.textMuted,
              fontWeight: isActive ? "700" : "500",
            },
          ]}
        >
          {node.name}
        </Text>
      </TouchableOpacity>

      {isFolder &&
        expanded &&
        children.map((child) => (
          <FileTreeItem
            key={child._id}
            node={child}
            fileTree={fileTree}
            depth={depth + 1}
            activeFileId={activeFileId}
            onSelectFile={onSelectFile}
          />
        ))}
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingRight: 10,
  },
  label: { fontSize: 12, flex: 1 },
});

export default FileTreeItem;