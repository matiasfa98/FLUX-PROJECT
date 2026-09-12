// client/src/lib/api.js

/*
|--------------------------------------------------------------------------
| API BASE — AUTO-DETECTED
|--------------------------------------------------------------------------
| In development, vite.config.js injects `__FLUX_LAN_IP__` with the
| current Wi-Fi/hotspot IP. That way the client always targets the right
| host without editing .env.
|
| In production you'd override via VITE_API_URL at build time.
|--------------------------------------------------------------------------
*/

const resolveLanIp = () => {
  // Production override wins.
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
  }

  // Development: injected by vite.config.js.
  if (typeof __FLUX_LAN_IP__ !== "undefined" && __FLUX_LAN_IP__) {
    return `http://${__FLUX_LAN_IP__}:4000`;
  }

  // Fallback.
  return "http://localhost:4000";
};

export const API_HOST = resolveLanIp();
export const API_BASE = `${API_HOST}/api`;
export const WS_BASE = API_HOST;

/*
|--------------------------------------------------------------------------
| TOKEN STORAGE
|--------------------------------------------------------------------------
*/

export const getAuthToken = () => {
  return localStorage.getItem("flux_token") || localStorage.getItem("token") || "";
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("flux_token", token);
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("flux_token");
    localStorage.removeItem("token");
  }
};

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint.replace(/^\/api/, "")}`;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
};