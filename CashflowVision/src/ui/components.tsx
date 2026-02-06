import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  TextStyle,
  ViewStyle,
  ScrollView,
} from "react-native";
import { theme } from "./theme";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={[styles.screenContent, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>{left}</View>
      {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
    </View>
  );
}

export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Sub({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.btn}>
      <Text style={styles.btnText}>{title}</Text>
    </Pressable>
  );
}

export function DangerButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, styles.btnDanger]}>
      <Text style={styles.btnText}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={theme.subtext}
    />
  );
}

const styles = StyleSheet.create({
  screenContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 28, // extra so last button isn't stuck at bottom
  },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "700", color: theme.text },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.subtext,
    textTransform: "uppercase",
  },
  sub: { fontSize: 14, color: theme.subtext },
  input: {
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  btn: {
    backgroundColor: theme.tint,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnDanger: { backgroundColor: theme.danger },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
