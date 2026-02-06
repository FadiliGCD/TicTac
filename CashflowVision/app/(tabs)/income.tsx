import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Title, Label, Row, Sub, PrimaryButton } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";
import { useRepo, IncomeRow } from "../../src/db/repo";

export default function IncomeScreen() {
  const repo = useRepo();
  const router = useRouter();
  const [rows, setRows] = useState<IncomeRow[]>([]);

  async function load() {
    setRows(await repo.listIncome());
  }

  useEffect(() => {
    load();
  }, []);

  function onAdd() {
    router.push("/income/edit");
  }

  function onEdit(id: number) {
    router.push({ pathname: "/income/edit", params: { id: String(id) } });
  }

  async function onDelete(id: number) {
    Alert.alert("Delete income?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await repo.deleteIncome(id);
          await load();
        },
      },
    ]);
  }

  async function toggleEnabled(row: IncomeRow) {
    const rule = JSON.parse(row.rule_json);
    await repo.upsertIncome({
      id: row.id,
      name: row.name,
      amount: row.amount,
      frequency: row.frequency,
      rule,
      enabled: row.enabled !== 1,
    });
    await load();
  }

  return (
    <Screen>
      <Row
        left={<Title>Income</Title>}
        right={
          <Pressable onPress={onAdd} style={styles.addBtn}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        }
      />

      <Card>
        <Label>Income sources</Label>
        {rows.length === 0 ? (
          <Sub>No incomes yet.</Sub>
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.item}>
              <Pressable onPress={() => onEdit(r.id)} style={{ flex: 1 }}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.meta}>
                  {r.amount.toFixed(2)} • {r.frequency} • {r.enabled === 1 ? "On" : "Off"}
                </Text>
              </Pressable>

              <View style={styles.actions}>
                <Pressable onPress={() => toggleEnabled(r)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>{r.enabled === 1 ? "Off" : "On"}</Text>
                </Pressable>
                <Pressable onPress={() => onDelete(r.id)} style={[styles.smallBtn, styles.deleteBtn]}>
                  <Text style={[styles.smallBtnText, { color: "#FFF" }]}>Del</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Card>

      <PrimaryButton title="Add income" onPress={onAdd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  addText: { color: theme.tint, fontWeight: "700" },
  item: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: { color: theme.text, fontSize: 16, fontWeight: "700" },
  meta: { color: theme.subtext, marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  smallBtn: {
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  smallBtnText: { color: theme.text, fontWeight: "700" },
  deleteBtn: { backgroundColor: theme.danger, borderColor: theme.danger },
});
