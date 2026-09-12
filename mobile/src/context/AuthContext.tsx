// mobile/src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { apiRequest, getAuthToken, setAuthToken } from "../lib/api";
import { disconnectSocket } from "../lib/socket";

export interface FluxUser {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  avatar?: string;
  status?: string;
  displayName?: string;
  bio?: string;
  pronouns?: string;
  timezone?: string;
}

interface AuthContextValue {
  user: FluxUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (username: string, email: string, password: string) => Promise<any>;
  claimQr: (payload: { token?: string; code?: string; deviceName?: string }) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (next: Partial<FluxUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FluxUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap session on mount.
  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiRequest("/auth/me");
        setUser(data.user);
      } catch (err) {
        console.warn("[auth] session expired:", err);
        await setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setAuthToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      await setAuthToken(data.token);
      setUser(data.user);
      return data;
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | CLAIM QR — the phone-side of the desktop's "Link Device" flow
  |--------------------------------------------------------------------------
  | Backend endpoint: POST /auth/qr/claim
  | Body: { token } or { code }, plus optional deviceName
  | Returns: { token: jwt, user }
  |--------------------------------------------------------------------------
  */
  const claimQr = useCallback(
    async (payload: { token?: string; code?: string; deviceName?: string }) => {
      const data = await apiRequest("/auth/qr/claim", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          deviceName: payload.deviceName || "Flux Mobile",
        }),
      });
      await setAuthToken(data.token);
      setUser(data.user);
      return data;
    },
    []
  );

  const logout = useCallback(async () => {
    await setAuthToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  const updateUser = useCallback((next: Partial<FluxUser>) => {
    setUser((prev) => ({ ...(prev || ({} as FluxUser)), ...next }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        claimQr,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
