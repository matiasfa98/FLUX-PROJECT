// mobile/src/context/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useRNColorScheme } from "react-native";
import { FluxColors, FluxPalette } from "../constants/theme";

type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  theme: ThemeMode;
  colors: FluxPalette;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "flux_theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useRNColorScheme();
  const [theme, setTheme] = useState<ThemeMode>(
    systemScheme === "light" ? "light" : "dark"
  );

  // Load persisted preference.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "dark" || stored === "light") {
          setTheme(stored);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  const colors = FluxColors[theme];

  return (
    <ThemeContext.Provider
      value={{ theme, colors, toggleTheme, isDark: theme === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useFluxTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useFluxTheme must be used within ThemeProvider");
  return ctx;
};