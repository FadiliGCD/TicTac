import React from "react";
import { Stack } from "expo-router";
import { Text } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDbIfNeeded } from "../src/db/migrate";
import { theme } from "../src/ui/theme";

function HeaderTitle() {
  return (
    <Text style={{ fontSize: 17, fontWeight: "700", color: theme.text }}>
      Tictac
    </Text>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="cashflow.db" onInit={migrateDbIfNeeded}>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTitle: () => <HeaderTitle />,
          headerTintColor: theme.tint,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen name="income/edit" options={{ headerShown: true }} />
        <Stack.Screen name="expenses/edit" options={{ headerShown: true }} />
        <Stack.Screen name="flows/edit" options={{ headerShown: true }} />
      </Stack>
    </SQLiteProvider>
  );
}
