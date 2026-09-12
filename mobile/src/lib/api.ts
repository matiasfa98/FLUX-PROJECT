// mobile/src/lib/api.ts
import Constants from 'expo-constants';

/*
|--------------------------------------------------------------------------
| BASE URL RESOLUTION
|--------------------------------------------------------------------------
| 1. Constants.expoConfig.extra.apiUrl    (injected by app.config.js)
| 2. Derive from Metro hostUri            (works on physical devices too)
| 3. Fallback to localhost:4000
|--------------------------------------------------------------------------
*/

const BACKEND_PORT = "4000";

function resolveApiUrl(): string {
  // 1. Bundle-time injection from app.config.js
  const injected = Constants.expoConfig?.extra?.apiUrl;
  if (typeof injected === "string" && injected.length > 0) {
    return injected;
  }

  // 2. Runtime fallback: derive from Metro's hostUri
  //    e.g. "192.168.1.10:8081" → "http://192.168.1.10:4000"
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri === "string" && hostUri.includes(":")) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }

  // 3. Last resort
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_HOST = resolveApiUrl();
export const API_BASE = `${API_HOST}/api`;
export const WS_BASE = API_HOST;

console.log("[flux-mobile] API_HOST =", API_HOST);

/*
|--------------------------------------------------------------------------
| TOKEN STORAGE
|--------------------------------------------------------------------------
| AsyncStorage is fine here. JWT is low-sensitivity for a dev project and
| AsyncStorage works identically on iOS, Android, and web. Switch to
| expo-secure-store later if you need hardware-backed storage.
|--------------------------------------------------------------------------
*/
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "flux_token";

export const getAuthToken = async (): Promise<string> => {
  try {
    return (await AsyncStorage.getItem(TOKEN_KEY)) || "";
  } catch {
    return "";
  }
};

export const setAuthToken = async (token: string | null): Promise<void> => {
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.warn("[auth] failed to persist token:", err);
  }
};

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = await getAuthToken();

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint.replace(/^\/api/, "")}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}`
    );
  }

  return data;
};