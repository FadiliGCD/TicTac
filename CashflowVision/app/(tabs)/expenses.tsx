import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Title, Label, Sub, PrimaryButton, Row } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";
import { useRepo, ExpenseRow } from "../../src/db/repo";

export default function ExpensesScreen() {
  const repo = useRepo();
  const router = useRouter();
  const [rows, setRows] = useState<ExpenseRow[]>([]);

  async function load() {
    setRows(await repo.listExpenses());
  }

  useEffect(() => {
    load();
  }, []);

  function onAdd() {
    router.push("/expenses/edit");
  }

  function onEdit(id: number) {
    router.push({ pathname: "/expenses/edit", params: { id: String(id) } });
  }

  async function onDelete(id: number) {
    Alert.alert("Delete expense?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await repo.deleteExpense(id);
          await load();
        },
      },
    ]);
  }

  async function toggleEnabled(row: ExpenseRow) {
    const rule = JSON.parse(row.rule_json);
    await repo.upsertExpense({
      id: row.id,
      name: row.name,
      category: row.category,
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
        left={<Title>Expenses</Title>}
        right={
          <Pressable onPress={onAdd} style={styles.addBtn}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        }
      />

      <Card>
        <Label>Recurring expenses</Label>
        {rows.length === 0 ? (
          <Sub>No expenses yet.</Sub>
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.item}>
              <Pressable onPress={() => onEdit(r.id)} style={{ flex: 1 }}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.meta}>
                  {r.category} • {r.amount.toFixed(2)} • {r.frequency} • {r.enabled === 1 ? "On" : "Off"}
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

      <PrimaryButton title="Add expense" onPress={onAdd} />
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
