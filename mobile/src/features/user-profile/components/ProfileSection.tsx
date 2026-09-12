// mobile/src/features/user-profile/components/ProfileSection.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Camera, Check, AlertCircle } from "lucide-react-native";
import { useAuth } from "../../../context/AuthContext";
import { useFluxTheme } from "../../../context/ThemeContext";
import { apiRequest } from "../../../lib/api";

const MAX_AVATAR_BYTES = 500_000;

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}

const Field = ({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  multiline,
  hint,
}: FieldProps) => {
  const { colors } = useFluxTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textDim }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: colors.bgSubpanel,
            borderColor: colors.border,
            color: colors.textMain,
          },
        ]}
      />
      {hint ? (
        <Text style={[styles.hint, { color: colors.textDim }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

export const ProfileSection = () => {
  const { user, updateUser } = useAuth();
  const { colors } = useFluxTheme();

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    bio: "",
    pronouns: "",
    timezone: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username || "",
      displayName: user.displayName || "",
      bio: user.bio || "",
      pronouns: user.pronouns || "",
      timezone:
        user.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC",
    });
  }, [user]);

  const updateField = (key: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setFeedback({ type: "success", text: "Profile updated." });
      updateUser(res.user);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to save profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Flux needs access to your photos to set an avatar."
      );
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    setUploadingAvatar(true);
    setFeedback(null);

    try {
      let quality = 0.85;
      let maxWidth = 512;

      let manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: maxWidth } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      let attempts = 0;
      while (
        manipulated.base64 &&
        base64Size(manipulated.base64) > MAX_AVATAR_BYTES &&
        attempts < 4
      ) {
        quality = Math.max(0.4, quality - 0.15);
        maxWidth = Math.max(256, maxWidth - 96);
        manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: maxWidth } }],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        attempts++;
      }

      if (!manipulated.base64) {
        throw new Error("Failed to process image");
      }
      if (base64Size(manipulated.base64) > MAX_AVATAR_BYTES) {
        throw new Error(
          "Image is too large even after compression (max 500 KB)."
        );
      }

      const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;

      const res = await apiRequest("/auth/me/avatar", {
        method: "PUT",
        body: JSON.stringify({ avatar: dataUri }),
      });
      updateUser(res.user);
      setFeedback({ type: "success", text: "Avatar updated." });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to upload avatar",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await apiRequest("/auth/me/avatar", {
        method: "PUT",
        body: JSON.stringify({ avatar: "" }),
      });
      updateUser(res.user);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to remove avatar",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initial = (form.displayName || form.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrap}>
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={[styles.avatarImg, { borderColor: colors.border }]}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                {
                  backgroundColor: colors.bgSubpanel,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.avatarInitial, { color: colors.accent }]}>
                {initial}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            style={[
              styles.cameraBtn,
              { backgroundColor: colors.accent, borderColor: colors.bgPanel },
            ]}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Camera size={12} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.avatarMeta}>
          <Text style={[styles.avatarName, { color: colors.textMain }]}>
            {form.displayName || form.username || "Operator"}
          </Text>
          <Text style={[styles.avatarHandle, { color: colors.textDim }]}>
            @{form.username || "unknown"}
          </Text>

          <View style={styles.avatarActions}>
            <TouchableOpacity
              onPress={handlePickAvatar}
              style={[
                styles.smallBtn,
                { borderColor: colors.border, backgroundColor: "transparent" },
              ]}
            >
              <Text
                style={[styles.smallBtnText, { color: colors.textMuted }]}
              >
                Upload
              </Text>
            </TouchableOpacity>
            {user?.avatar ? (
              <TouchableOpacity
                onPress={handleRemoveAvatar}
                style={[
                  styles.smallBtn,
                  {
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    backgroundColor: "transparent",
                  },
                ]}
              >
                <Text
                  style={[styles.smallBtnText, { color: colors.danger }]}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {feedback && (
        <View
          style={[
            styles.feedback,
            {
              backgroundColor:
                feedback.type === "success"
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
              borderColor:
                feedback.type === "success" ? colors.online : colors.danger,
            },
          ]}
        >
          {feedback.type === "success" ? (
            <Check size={12} color={colors.online} />
          ) : (
            <AlertCircle size={12} color={colors.danger} />
          )}
          <Text
            style={[
              styles.feedbackText,
              {
                color:
                  feedback.type === "success" ? colors.online : colors.danger,
              },
            ]}
          >
            {feedback.text}
          </Text>
        </View>
      )}

      <Field
        label="USERNAME"
        value={form.username}
        onChange={updateField("username")}
        maxLength={30}
        hint="3-30 chars. Letters, numbers, _ and -"
      />
      <Field
        label="DISPLAY NAME"
        value={form.displayName}
        onChange={updateField("displayName")}
        maxLength={60}
        placeholder="Your friendly name"
      />
      <Field
        label="PRONOUNS"
        value={form.pronouns}
        onChange={updateField("pronouns")}
        maxLength={20}
        placeholder="they/them"
      />
      <Field
        label="TIMEZONE"
        value={form.timezone}
        onChange={updateField("timezone")}
        maxLength={60}
      />
      <Field
        label="BIO"
        value={form.bio}
        onChange={updateField("bio")}
        maxLength={280}
        multiline
        placeholder="A short description"
        hint={`${form.bio.length}/280`}
      />

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        style={[
          styles.saveBtn,
          { backgroundColor: saving ? colors.textDim : colors.accent },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Profile</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const base64Size = (b64: string): number =>
  Math.floor((b64.length * 3) / 4);

const styles = StyleSheet.create({
  container: { gap: 16 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  avatarWrap: { position: "relative" },
  avatarImg: { width: 76, height: 76, borderRadius: 18, borderWidth: 1 },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 28, fontWeight: "800" },
  cameraBtn: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMeta: { flex: 1, minWidth: 0 },
  avatarName: { fontSize: 15, fontWeight: "700" },
  avatarHandle: { fontSize: 12, marginTop: 2 },
  avatarActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  smallBtnText: { fontSize: 10, fontWeight: "700" },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  feedbackText: { fontSize: 11, flex: 1 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  hint: { fontSize: 10, marginTop: 2 },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default ProfileSection;