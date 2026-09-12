// mobile/src/components/CodeViewer.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFluxTheme } from "../context/ThemeContext";

interface Props {
  content: string;
  language?: string;
  filename?: string;
}

export const CodeViewer = ({ content }: Props) => {
  const { colors } = useFluxTheme();

  if (!content) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bgMain }]}>
        <Text style={[styles.emptyText, { color: colors.textDim }]}>
          This file is empty.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <Text
          style={[
            styles.code,
            { color: colors.textMain },
          ]}
          selectable
        >
          {content}
        </Text>
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  code: {
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
    padding: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: { fontSize: 12 },
});

export default CodeViewer;