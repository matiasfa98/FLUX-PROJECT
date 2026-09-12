// mobile/src/app/(auth)/link-device.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import {
  ArrowLeft,
  QrCode,
  Camera as CameraIcon,
  Hash,
  Check,
  AlertCircle,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useFluxTheme } from "../../context/ThemeContext";

type Mode = "scan" | "manual";

export default function LinkDeviceScreen() {
  const router = useRouter();
  const { colors } = useFluxTheme();
  const { claimQr } = useAuth();

  const [mode, setMode] = useState<Mode>("scan");
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanned, setScanned] = useState(false);

  const scannedRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | ASK FOR CAMERA PERMISSION ON MOUNT (only in scan mode)
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (mode === "scan" && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [mode, permission, requestPermission]);

  /*
  |--------------------------------------------------------------------------
  | PARSE QR PAYLOAD
  |--------------------------------------------------------------------------
  | The desktop generates: flux://link?token=<hex>
  | We extract the token. If the payload isn't our format, reject.
  |--------------------------------------------------------------------------
  */
  const parseQrPayload = (raw: string): string | null => {
    try {
      // Format: flux://link?token=abc123
      const url = new URL(raw);
      if (url.protocol !== "flux:") return null;
      return url.searchParams.get("token");
    } catch {
      return null;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CLAIM
  |--------------------------------------------------------------------------
  */
  const claim = async (payload: { token?: string; code?: string }) => {
    setError("");
    setSubmitting(true);
    try {
      await claimQr({ ...payload, deviceName: "Flux Mobile" });
      // AuthGate in _layout handles redirect.
    } catch (err: any) {
      setError(err.message || "Failed to link device");
      // Allow rescan.
      setScanned(false);
      scannedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | QR SCAN HANDLER
  |--------------------------------------------------------------------------
  */
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current || submitting) return;
    scannedRef.current = true;
    setScanned(true);

    const token = parseQrPayload(data);
    if (!token) {
      setError("This QR code isn't a Flux link code.");
      setTimeout(() => {
        setScanned(false);
        scannedRef.current = false;
      }, 1500);
      return;
    }

    claim({ token });
  };

  /*
  |--------------------------------------------------------------------------
  | MANUAL CODE HANDLER
  |--------------------------------------------------------------------------
  */
  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError("Enter the 6-digit code from your desktop.");
      return;
    }
    claim({ code });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgMain }]}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
      >
        <ArrowLeft size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textMain }]}>
          Link Device
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Open Flux on your desktop, go to{" "}
          <Text style={{ color: colors.accent }}>Settings → Link Device</Text>,
          then scan the QR or enter the 6-digit code.
        </Text>

        {/* Mode toggle */}
        <View
          style={[
            styles.toggle,
            { backgroundColor: colors.bgPanel, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mode === "scan" && { backgroundColor: colors.bgActive },
            ]}
            onPress={() => {
              setMode("scan");
              setError("");
            }}
          >
            <CameraIcon
              size={13}
              color={mode === "scan" ? colors.accent : colors.textDim}
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    mode === "scan" ? colors.textMain : colors.textDim,
                },
              ]}
            >
              Scan QR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mode === "manual" && { backgroundColor: colors.bgActive },
            ]}
            onPress={() => {
              setMode("manual");
              setError("");
            }}
          >
            <Hash
              size={13}
              color={mode === "manual" ? colors.accent : colors.textDim}
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    mode === "manual" ? colors.textMain : colors.textDim,
                },
              ]}
            >
              Enter Code
            </Text>
          </TouchableOpacity>
        </View>

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

        {/* SCAN MODE */}
        {mode === "scan" && (
          <View
            style={[
              styles.cameraWrap,
              { borderColor: colors.border },
            ]}
          >
            {!permission ? (
              <View style={styles.cameraPlaceholder}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : !permission.granted ? (
              <View style={styles.cameraPlaceholder}>
                <QrCode size={32} color={colors.textDim} />
                <Text
                  style={[styles.permText, { color: colors.textMuted }]}
                >
                  Camera permission required to scan.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.permBtn,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={requestPermission}
                >
                  <Text style={styles.permBtnText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
  style={StyleSheet.absoluteFill}
  facing="back"
  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
/>
            )}

            {submitting && (
              <View style={styles.cameraOverlay}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.overlayText}>Linking…</Text>
              </View>
            )}

            {scanned && !submitting && !error && (
              <View style={styles.cameraOverlay}>
                <Check size={32} color="#10b981" />
                <Text style={styles.overlayText}>Linked</Text>
              </View>
            )}
          </View>
        )}

        {/* MANUAL MODE */}
        {mode === "manual" && (
          <View style={styles.manualWrap}>
            <TextInput
              value={manualCode}
              onChangeText={(t) => setManualCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              style={[
                styles.codeInput,
                {
                  color: colors.textMain,
                  backgroundColor: colors.bgSubpanel,
                  borderColor: colors.border,
                },
              ]}
              textAlign="center"
            />
            <Text style={[styles.hint, { color: colors.textDim }]}>
              The code is shown on your desktop's Link Device screen.
            </Text>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor:
                    submitting || manualCode.length !== 6
                      ? colors.textDim
                      : colors.accent,
                },
              ]}
              onPress={handleManualSubmit}
              disabled={submitting || manualCode.length !== 6}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Link Device</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 20, width: 60 },
  content: { flex: 1, paddingHorizontal: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  toggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleText: { fontSize: 12, fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  errorText: { fontSize: 12, flex: 1 },
  cameraWrap: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#000",
    minHeight: 300,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  permText: { fontSize: 12, textAlign: "center" },
  permBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  permBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cameraOverlay: {
  ...StyleSheet.absoluteFill,
  backgroundColor: "rgba(0,0,0,0.75)",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
},
  overlayText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  manualWrap: { gap: 12, marginTop: 8 },
  codeInput: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 12,
    paddingVertical: 18,
    borderRadius: 8,
    borderWidth: 1,
  },
  hint: { fontSize: 11, textAlign: "center" },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});