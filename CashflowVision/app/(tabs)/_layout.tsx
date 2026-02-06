import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { theme } from "../../src/ui/theme";

function HeaderTitle() {
  return (
    <Text style={{ fontSize: 17, fontWeight: "700", color: theme.text }}>
      Tictac
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTitle: () => <HeaderTitle />,
        headerTintColor: theme.tint,
        tabBarActiveTintColor: theme.tint,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="income" options={{ title: "Income" }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
      <Tabs.Screen name="flows" options={{ title: "Flows" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
