// mobile/src/app/workspace/[roomId]/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { ArrowLeft, FileCode, Terminal as TermIcon } from "lucide-react-native";
import { useFluxTheme } from "../../../context/ThemeContext";

export default function WorkspaceLayout() {
  const router = useRouter();
  const { colors } = useFluxTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bgPanel },
        headerTintColor: colors.textMain,
        headerTitleStyle: { fontSize: 14, fontWeight: "700" },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={{ paddingHorizontal: 12 }}
          >
            <ArrowLeft size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: colors.bgPanel,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="files"
        options={{
          title: "Files",
          headerTitle: "Workspace",
          tabBarIcon: ({ color, size }) => (
            <FileCode size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          title: "Terminal",
          tabBarIcon: ({ color, size }) => (
            <TermIcon size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}