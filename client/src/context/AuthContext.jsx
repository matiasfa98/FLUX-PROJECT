// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, getAuthToken, setAuthToken } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load existing session on initial app boot
  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me");
        setUser(data.user);
      } catch (err) {
        console.error("Session expired or invalid:", err);
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setAuthToken(data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (username, email, password) => {
    const data = await apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });

    setAuthToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  // Merge partial user updates into the current user object.
  // Used by ProfileSection after saving profile / avatar changes.
  const updateUser = (next) => {
    setUser((prev) => ({ ...(prev || {}), ...next }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};