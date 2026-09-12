// mobile/src/app/(auth)/sign-in.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail, Lock, AlertCircle } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useFluxTheme } from "../../context/ThemeContext";

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useFluxTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // AuthGate in _layout will redirect automatically.
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textMain }]}>
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Sign in to access your rooms and conversations.
          </Text>

          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                },
              ]}
            >
              <AlertCircle size={14} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textDim }]}>
              EMAIL
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.bgSubpanel,
                  borderColor: colors.border,
                },
              ]}
            >
              <Mail size={14} color={colors.textDim} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.textMain }]}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textDim }]}>
              PASSWORD
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.bgSubpanel,
                  borderColor: colors.border,
                },
              ]}
            >
              <Lock size={14} color={colors.textDim} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textDim}
                secureTextEntry
                style={[styles.input, { color: colors.textMain }]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: submitting
                  ? colors.textDim
                  : colors.accent,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/(auth)/sign-up")}
            style={styles.switchBtn}
          >
            <Text style={[styles.switchText, { color: colors.textMuted }]}>
              Don't have an account?{" "}
              <Text style={{ color: colors.accent, fontWeight: "700" }}>
                Sign up
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 20, width: 60 },
  content: { flex: 1, paddingHorizontal: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginBottom: 8, lineHeight: 19 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  errorText: { fontSize: 12, flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 14, padding: 0 },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  switchBtn: { alignItems: "center", paddingVertical: 12 },
  switchText: { fontSize: 13 },
});