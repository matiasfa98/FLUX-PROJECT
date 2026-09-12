// mobile/src/app/(auth)/welcome.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Zap, LogIn, UserPlus, QrCode } from "lucide-react-native";
import { useFluxTheme } from "../../context/ThemeContext";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useFluxTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      {/* Brand header */}
      <View style={styles.brandRow}>
        <Zap size={28} color={colors.accent} />
        <Text style={[styles.brandText, { color: colors.textMain }]}>
          FLUX
        </Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={[styles.title, { color: colors.textMain }]}>
          Collaborative{'\n'}Code Cockpit
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Join rooms, watch live sessions, and stay connected with your team — from anywhere.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/(auth)/sign-in")}
          activeOpacity={0.85}
        >
          <LogIn size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            { borderColor: colors.border, backgroundColor: colors.bgPanel },
          ]}
          onPress={() => router.push("/(auth)/sign-up")}
          activeOpacity={0.85}
        >
          <UserPlus size={16} color={colors.textMain} />
          <Text style={[styles.secondaryBtnText, { color: colors.textMain }]}>
            Create Account
          </Text>
        </TouchableOpacity>

        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        >
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textDim }]}>
            OR
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[
            styles.linkBtn,
            {
              borderColor: colors.accent,
              backgroundColor: "transparent",
            },
          ]}
          onPress={() => router.push("/(auth)/link-device")}
          activeOpacity={0.85}
        >
          <QrCode size={16} color={colors.accent} />
          <Text style={[styles.linkBtnText, { color: colors.accent }]}>
            Link Device
          </Text>
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.textDim }]}>
          Already signed in on desktop? Scan the QR code to link instantly.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 24,
  },
  brandText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 3,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  actions: { gap: 12, paddingBottom: 32 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 6,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  linkBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  hint: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 2,
  },
});