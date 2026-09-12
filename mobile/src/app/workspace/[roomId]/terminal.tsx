// mobile/src/app/workspace/[roomId]/terminal.tsx
import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Terminal as TermIcon, Eye } from "lucide-react-native";
import { useFluxTheme } from "../../../context/ThemeContext";
import { useWorkspaceSocket } from "../../../hooks/useWorkspaceSocket";

/*
|--------------------------------------------------------------------------
| ANSI PARSING
|--------------------------------------------------------------------------
| Two jobs:
|   1. Strip control sequences that aren't about text (cursor, title, etc.)
|   2. Extract SGR color sequences (\x1b[32m etc.) and turn them into styled
|      spans that React Native can render.
|
| We don't need full VT100 emulation — just enough to make terminal output
| readable with colors.
|--------------------------------------------------------------------------
*/

const ANSI_REGEX = /\x1b\[([0-9;?]*)m/g;

interface Segment {
  text: string;
  color?: string;
  bold?: boolean;
  dim?: boolean;
}

/**
 * Strip all non-SGR escape sequences from the buffer.
 * This runs BEFORE the color parser so the color parser only sees
 * meaningful \x1b[..m sequences.
 */
const cleanControlSequences = (raw: string): string => {
  return (
    raw
      // OSC: ESC ] ... BEL or ESC ] ... ESC \
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
      // CSI with ? > < modifier (private modes, focus reporting, cursor)
      // — but NOT if it ends in 'm' (those are color codes we want to keep)
      .replace(/\x1b\[[?>][0-9;]*[A-Za-z]/g, "")
      // Regular CSI: cursor moves, erase, etc. — keep only 'm'
      .replace(/\x1b\[[0-9;]*[A-HJ-Za-ln-rt-z]/g, "")
      // Two-char escapes (ESC followed by a single char)
      .replace(/\x1b[@-Z\\-_]/g, "")
      // Stray BEL and CR
      .replace(/[\x07\r]/g, "")
  );
};

/**
 * Parse a cleaned string into styled segments.
 * Recognizes the standard 8 ANSI colors + bold + dim + reset.
 */
const parseAnsiColors = (input: string, isDark: boolean): Segment[] => {
  const segments: Segment[] = [];

  // Color palette — slightly tuned per theme for readability
  const palette = isDark
    ? {
        black: "#3f4756",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#a78bfa",
        cyan: "#38bdf8",
        white: "#e2e8f0",
        brightBlack: "#64748b",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#c4b5fd",
        brightCyan: "#67e8f9",
        brightWhite: "#f8fafc",
      }
    : {
        black: "#0f172a",
        red: "#dc2626",
        green: "#059669",
        yellow: "#d97706",
        blue: "#2563eb",
        magenta: "#7c3aed",
        cyan: "#0284c7",
        white: "#1e293b",
        brightBlack: "#475569",
        brightRed: "#b91c1c",
        brightGreen: "#047857",
        brightYellow: "#b45309",
        brightBlue: "#1d4ed8",
        brightMagenta: "#6d28d9",
        brightCyan: "#0369a1",
        brightWhite: "#0f172a",
      };

  const CODE_TO_COLOR: Record<number, string> = {
    30: palette.black,
    31: palette.red,
    32: palette.green,
    33: palette.yellow,
    34: palette.blue,
    35: palette.magenta,
    36: palette.cyan,
    37: palette.white,
    90: palette.brightBlack,
    91: palette.brightRed,
    92: palette.brightGreen,
    93: palette.brightYellow,
    94: palette.brightBlue,
    95: palette.brightMagenta,
    96: palette.brightCyan,
    97: palette.brightWhite,
  };

  let cursor = 0;
  let match: RegExpExecArray | null;
  let current: Segment = { text: "" };

  // Reset the regex state.
  ANSI_REGEX.lastIndex = 0;

  const flush = () => {
    if (current.text.length > 0) {
      segments.push({ ...current });
      current = {
        text: "",
        color: current.color,
        bold: current.bold,
        dim: current.dim,
      };
    }
  };

  while ((match = ANSI_REGEX.exec(input)) !== null) {
    const beforeText = input.slice(cursor, match.index);
    if (beforeText) {
      current.text += beforeText;
    }
    flush();

    const codes = match[1].length ? match[1].split(";").map((n) => parseInt(n, 10)) : [0];

    for (const code of codes) {
      if (code === 0) {
        current.color = undefined;
        current.bold = false;
        current.dim = false;
      } else if (code === 1) {
        current.bold = true;
      } else if (code === 2) {
        current.dim = true;
      } else if (code === 22) {
        current.bold = false;
        current.dim = false;
      } else if (code === 39) {
        current.color = undefined;
      } else if (CODE_TO_COLOR[code]) {
        current.color = CODE_TO_COLOR[code];
      }
      // We deliberately ignore 40-49 (background colors) — too noisy for mobile.
    }

    cursor = match.index + match[0].length;
  }

  // Trailing text after the last escape sequence
  const remaining = input.slice(cursor);
  if (remaining) current.text += remaining;
  flush();

  if (segments.length === 0) {
    segments.push({ text: input });
  }

  return segments;
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function TerminalTab() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { colors, isDark } = useFluxTheme();
  const ws = useWorkspaceSocket(roomId || null);
  const scrollRef = useRef<ScrollView>(null);

  // Clean first (strip non-color escapes), then parse into styled segments.
  const segments = useMemo(() => {
    const cleaned = cleanControlSequences(ws.terminalBuffer);
    return parseAnsiColors(cleaned, isDark);
  }, [ws.terminalBuffer, isDark]);

  // Auto-scroll on new output.
  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      40
    );
    return () => clearTimeout(t);
  }, [segments.length]);

  const isEmpty = segments.length === 0 || (segments.length === 1 && !segments[0].text);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgMain }]}>
      {/* Header bar */}
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.bgPanel, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.barLeft}>
          <TermIcon size={12} color={colors.info} />
          <Text style={[styles.barText, { color: colors.textMain }]}>
            TERMINAL
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              borderColor: "rgba(245, 158, 11, 0.4)",
            },
          ]}
        >
          <Eye size={10} color={colors.warning} />
          <Text style={[styles.pillText, { color: colors.warning }]}>
            READ ONLY
          </Text>
        </View>
      </View>

      {/* Terminal body */}
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, { backgroundColor: colors.bgMain }]}
        contentContainerStyle={styles.scrollContent}
      >
        {isEmpty ? (
          <Text style={[styles.term, { color: colors.textDim }]}>
            [waiting for output…]
          </Text>
        ) : (
          <Text style={[styles.term, { color: colors.textMain }]} selectable>
            {segments.map((seg, i) => (
              <Text
                key={i}
                style={{
                  color: seg.color || colors.textMain,
                  fontWeight: seg.bold ? "700" : "400",
                  opacity: seg.dim ? 0.6 : 1,
                }}
              >
                {seg.text}
              </Text>
            ))}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  barLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  barText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  pillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, minHeight: "100%" },
  term: {
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
  },
});