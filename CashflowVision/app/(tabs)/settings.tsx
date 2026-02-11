import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Screen,
  Card,
  Title,
  Label,
  Sub,
  Input,
  PrimaryButton,
  DangerButton,
} from "../../src/ui/components";
import { theme } from "../../src/ui/theme";

const KEY_USER_NAME = "tictac:user:name";
const KEY_USER_EMAIL = "tictac:user:email";
const KEY_USER_PHONE = "tictac:user:phone";

async function setOrRemove(key: string, value: string) {
  const v = value.trim();
  if (!v) {
    await AsyncStorage.removeItem(key);
  } else {
    await AsyncStorage.setItem(key, v);
  }
}

export default function SettingsScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const hasAny = useMemo(
    () => !!name.trim() || !!email.trim() || !!phone.trim(),
    [name, email, phone]
  );

  useEffect(() => {
    (async () => {
      const [n, e, p] = await Promise.all([
        AsyncStorage.getItem(KEY_USER_NAME),
        AsyncStorage.getItem(KEY_USER_EMAIL),
        AsyncStorage.getItem(KEY_USER_PHONE),
      ]);

      setName(n ?? "");
      setEmail(e ?? "");
      setPhone(p ?? "");
    })();
  }, []);

  async function onSave() {
    await Promise.all([
      setOrRemove(KEY_USER_NAME, name),
      setOrRemove(KEY_USER_EMAIL, email),
      setOrRemove(KEY_USER_PHONE, phone),
    ]);

    Alert.alert("Saved", "Your details have been updated.");
  }

  async function onClear() {
    Alert.alert("Clear details?", "This will remove saved name, email, and phone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await Promise.all([
            AsyncStorage.removeItem(KEY_USER_NAME),
            AsyncStorage.removeItem(KEY_USER_EMAIL),
            AsyncStorage.removeItem(KEY_USER_PHONE),
          ]);
          setName("");
          setEmail("");
          setPhone("");
        },
      },
    ]);
  }

  return (
    <Screen>
      <Title>Settings</Title>

      <Card>
        <Label>Personal details (optional)</Label>
        <Sub>You can leave these empty.</Sub>

        <View style={styles.field}>
          <Sub style={styles.fieldLabel}>Name</Sub>
          <Input value={name} onChangeText={setName} placeholder="Your name" />
        </View>

        <View style={styles.field}>
          <Sub style={styles.fieldLabel}>Email</Sub>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Sub style={styles.fieldLabel}>Phone</Sub>
          <Input
            value={phone}
            onChangeText={setPhone}
            placeholder="+353..."
            keyboardType="phone-pad"
          />
        </View>

        <PrimaryButton title="Save" onPress={onSave} />
        <DangerButton title="Clear details" onPress={onClear} />
        {!hasAny ? <Sub>Nothing saved yet.</Sub> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  fieldLabel: { color: theme.subtext },
});
