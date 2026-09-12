// mobile/src/app/(tabs)/settings.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { User as UserIcon, Sun, Moon, LogOut, Palette } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useFluxTheme } from "../../context/ThemeContext";
import { ProfileSection } from "../../features/user-profile/components/ProfileSection";

const Section = ({ title, icon: Icon, children }: any) => {
  const { colors } = useFluxTheme();
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.bgPanel, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.bgSubpanel,
          },
        ]}
      >
        <Icon size={14} color={colors.accent} />
        <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
          {title}
        </Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
};

export default function SettingsTab() {
  const { logout } = useAuth();
  const { colors, theme, toggleTheme } = useFluxTheme();

  const confirmLogout = () => {
    Alert.alert(
      "Sign out?",
      "You'll need to sign in again to access your rooms.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textMain }]}>
            Settings
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Manage your operator profile.
          </Text>
        </View>

        <Section title="PROFILE" icon={UserIcon}>
          <ProfileSection />
        </Section>

        <Section title="APPEARANCE" icon={Palette}>
          <TouchableOpacity onPress={toggleTheme} style={styles.row}>
            {theme === "dark" ? (
              <Sun size={18} color="#f59e0b" />
            ) : (
              <Moon size={18} color="#4f46e5" />
            )}
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textMain }]}>
                Theme
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textDim }]}>
                Currently using {theme} mode
              </Text>
            </View>
            <Text style={[styles.rowAction, { color: colors.accent }]}>
              Toggle
            </Text>
          </TouchableOpacity>
        </Section>

        <TouchableOpacity
          onPress={confirmLogout}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              borderColor: "rgba(239, 68, 68, 0.3)",
            },
          ]}
        >
          <LogOut size={16} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            Sign Out
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textDim }]}>
          FLUX MOBILE v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  header: { paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 4 },
  section: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  sectionBody: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13, fontWeight: "700" },
  rowSubtitle: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  rowAction: { fontSize: 12, fontWeight: "700" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutText: { fontSize: 13, fontWeight: "700" },
  footer: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 0.8,
  },
});