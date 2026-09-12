// mobile/app.config.js
const os = require("os");

/*
|--------------------------------------------------------------------------
| LAN IP DETECTION (same logic as get-ip.js)
|--------------------------------------------------------------------------
| Prefers a real Wi-Fi/Ethernet adapter, skips virtual ones.
| Returns the address a phone on the same Wi-Fi can reach.
|--------------------------------------------------------------------------
*/
function getLanIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs || []) {
      if (addr.family !== "IPv4") continue;
      if (addr.internal) continue;

      const lowered = name.toLowerCase();
      if (
        lowered.includes("vmware") ||
        lowered.includes("vethernet") ||
        lowered.includes("hyper-v") ||
        lowered.includes("virtualbox")
      ) {
        continue;
      }

      candidates.push({ name, address: addr.address });
    }
  }

  const preferred = candidates.find((c) => {
    const l = c.name.toLowerCase();
    return l.includes("wi-fi") || l.includes("wifi") || l.includes("ethernet");
  });

  return preferred?.address || candidates[0]?.address || "127.0.0.1";
}

const LAN_IP = getLanIp();
const BACKEND_PORT = process.env.FLUX_BACKEND_PORT || "4000";

console.log(`[flux-mobile] detected LAN IP: ${LAN_IP}`);
console.log(`[flux-mobile] backend will be: http://${LAN_IP}:${BACKEND_PORT}`);

module.exports = {
  expo: {
    name: "Flux",
    slug: "flux-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "flux",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#07090e",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "dev.flux.mobile",
      infoPlist: {
        NSCameraUsageDescription:
          "Flux uses your camera to scan QR codes for device linking.",
        NSMicrophoneUsageDescription:
          "Flux uses your microphone to receive voice from the active driver's broadcast.",
      },
    },

    android: {
      package: "dev.flux.mobile",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#07090e",
      },
      permissions: ["CAMERA", "RECORD_AUDIO"],
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
  "expo-router",
  [
    "expo-camera",
    {
      cameraPermission:
        "Flux uses your camera to scan QR codes for device linking.",
    },
  ],
  [
    "expo-image-picker",
    {
      photosPermission:
        "Flux uses your photo library to set a profile avatar.",
    },
  ],
  "expo-secure-store",
],

    experiments: {
      typedRoutes: true,
    },

    /*
    |----------------------------------------------------------------------
    | INJECTED AT BUNDLE TIME
    |----------------------------------------------------------------------
    | Access from the app via:
    |   Constants.expoConfig.extra.apiUrl
    |----------------------------------------------------------------------
    */
    extra: {
      lanIp: LAN_IP,
      backendPort: BACKEND_PORT,
      apiUrl: `http://${LAN_IP}:${BACKEND_PORT}`,
    },
  },
};