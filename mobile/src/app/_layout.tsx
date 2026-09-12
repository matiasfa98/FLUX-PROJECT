// mobile/src/app/_layout.tsx
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { store } from "../store";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

SplashScreen.preventAutoHideAsync();

/*
|--------------------------------------------------------------------------
| AUTH GATE
|--------------------------------------------------------------------------
| Watches auth state and redirects between (auth) and (tabs) groups.
| Runs once per auth change. Guards against routing before hydration.
|--------------------------------------------------------------------------
*/
function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, segments, router]);

  return null;
}

/*
|--------------------------------------------------------------------------
| INNER LAYOUT (has access to auth context)
|--------------------------------------------------------------------------
*/
function RootNavigator() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  return (
    <>
      <StatusBar style="auto" />
      <AuthGate />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/
export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}