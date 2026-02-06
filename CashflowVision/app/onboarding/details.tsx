import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ONBOARDING_DONE = "tictac:onboardingDone";
const KEY_USER_NAME = "tictac:user:name";
const KEY_USER_PHONE = "tictac:user:phone";

export default function Details() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    // If user somehow returns here after finishing onboarding, bounce them to dashboard
    (async () => {
      const done = await AsyncStorage.getItem(KEY_ONBOARDING_DONE);
      if (done === "1") router.replace("/(tabs)/dashboard");
    })();
  }, []);

  async function onSet() {
    const n = name.trim();
    const p = phone.trim();

    if (!n) return Alert.alert("Name required", "Please enter your name.");
    if (!p) return Alert.alert("Phone required", "Please enter your phone number.");

    await AsyncStorage.setItem(KEY_USER_NAME, n);
    await AsyncStorage.setItem(KEY_USER_PHONE, p);
    await AsyncStorage.setItem(KEY_ONBOARDING_DONE, "1");

    router.replace("/(tabs)/dashboard");
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Your details</Text>
        <Text style={styles.sub}>This helps personalize your experience.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#8E8E93"
          style={styles.input}
        />

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+353..."
          placeholderTextColor="#8E8E93"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Pressable onPress={onSet} style={styles.btn}>
          <Text style={styles.btnText}>Set</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", padding: 16, justifyContent: "center" },
  card: { backgroundColor: "#111", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  title: { color: "#FFF", fontSize: 22, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.75)", marginTop: 6, marginBottom: 14, fontWeight: "600" },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginTop: 10 },
  input: {
    marginTop: 8,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  btn: { marginTop: 16, backgroundColor: "#FFF", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#000", fontSize: 16, fontWeight: "900" },
  linkBtn: { marginTop: 12, alignItems: "center" },
  linkText: { color: "rgba(255,255,255,0.75)", fontWeight: "700" },
});
