import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ONBOARDING_DONE = "tictac:onboardingDone";

export default function Welcome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(KEY_ONBOARDING_DONE);
      if (done === "1") {
        router.replace("/(tabs)/dashboard");
        return;
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  return (
    <View style={styles.root}>
      <Video
        source={require("../assets/welcome.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <Text style={styles.brand}>Tictac</Text>
        <Text style={styles.tagline}>See where your money goes.</Text>

        <Pressable
          onPress={() => router.push("/onboarding/details")}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  content: { flex: 1, padding: 20, justifyContent: "flex-end", paddingBottom: 60 },
  brand: { color: "#FFF", fontSize: 44, fontWeight: "800", letterSpacing: 0.5 },
  tagline: { color: "rgba(255,255,255,0.85)", marginTop: 8, fontSize: 16, fontWeight: "600" },
  btn: { marginTop: 18, backgroundColor: "#FFF", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#000", fontSize: 16, fontWeight: "800" },
});
