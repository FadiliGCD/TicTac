import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen, Card, Title, Label, Input, Sub, PrimaryButton, DangerButton } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";
import type { Frequency } from "../../src/domain/money";
import type { ScheduleRule } from "../../src/domain/schedule";
import { isoDate } from "../../src/domain/schedule";
import { useRepo, IncomeRow } from "../../src/db/repo";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function defaultRuleForFrequency(freq: Frequency): ScheduleRule {
  if (freq === "weekly") return { kind: "weekly", dayOfWeek: 5 }; // Friday default
  if (freq === "fortnightly") return { kind: "fortnightly", anchorISO: isoDate(new Date()) };
  if (freq === "monthly") return { kind: "monthly", dayOfMonth: 1 };
  return { kind: "once", dateISO: isoDate(new Date()) };
}

export default function IncomeEdit() {
  const repo = useRepo();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : undefined;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [enabled, setEnabled] = useState(true);
  const [rule, setRule] = useState<ScheduleRule>(defaultRuleForFrequency("monthly"));

  useEffect(() => {
    (async () => {
      if (!id) {
        setRule(defaultRuleForFrequency("monthly"));
        return;
      }
      const rows = await repo.listIncome();
      const row = rows.find((x) => x.id === id) as IncomeRow | undefined;
      if (!row) return;

      setName(row.name);
      setAmount(String(row.amount));
      setFrequency(row.frequency as Frequency);
      setEnabled(row.enabled === 1);
      setRule(JSON.parse(row.rule_json) as ScheduleRule);
    })();
  }, [id]);

  const canSave = useMemo(() => name.trim().length > 0 && Number.isFinite(Number(amount)), [name, amount]);

  function setFreq(next: Frequency) {
    setFrequency(next);
    setRule(defaultRuleForFrequency(next));
  }

  async function save() {
    const amt = Number(amount);
    if (!name.trim()) return Alert.alert("Name required");
    if (!Number.isFinite(amt)) return Alert.alert("Invalid amount", "Enter a valid number.");

    if (frequency === "once") {
      const r = rule as any;
      if (!r?.dateISO || typeof r.dateISO !== "string" || r.dateISO.length !== 10) {
        return Alert.alert("Invalid date", "Use format YYYY-MM-DD");
      }
    }

    await repo.upsertIncome({
      id,
      name: name.trim(),
      amount: amt,
      frequency,
      rule,
      enabled,
    });

    router.back();
  }

  async function del() {
    if (!id) return router.back();
    Alert.alert("Delete income?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await repo.deleteIncome(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Title>{id ? "Edit income" : "New income"}</Title>

      <Card>
        <Label>Name</Label>
        <Input value={name} onChangeText={setName} placeholder="Salary / Bonus / Refund" />
      </Card>

      <Card>
        <Label>Amount</Label>
        <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      </Card>

      <Card>
        <Label>Frequency</Label>
        <View style={styles.pills}>
          {(["once", "weekly", "fortnightly", "monthly"] as Frequency[]).map((f) => (
            <Pressable key={f} onPress={() => setFreq(f)} style={[styles.pill, frequency === f && styles.pillOn]}>
              <Text style={[styles.pillText, frequency === f && styles.pillTextOn]}>{f}</Text>
            </Pressable>
          ))}
        </View>
        {frequency === "once" ? (
          <Sub style={{ marginTop: 8 }}>
            One-time income shows once on the Calendar (e.g., bonus, tax return).
          </Sub>
        ) : null}
      </Card>

      <Card>
        <Label>Schedule</Label>

        {frequency === "once" && rule.kind === "once" ? (
          <>
            <Sub>One-time date</Sub>
            <Input
              value={rule.dateISO}
              onChangeText={(t) => setRule({ kind: "once", dateISO: t })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </>
        ) : null}

        {frequency === "weekly" && rule.kind === "weekly" ? (
          <>
            <Sub>Select day of week (default Friday)</Sub>
            <View style={styles.pills}>
              {DOW.map((d, idx) => (
                <Pressable
                  key={d}
                  onPress={() => setRule({ kind: "weekly", dayOfWeek: idx })}
                  style={[styles.pill, rule.dayOfWeek === idx && styles.pillOn]}
                >
                  <Text style={[styles.pillText, rule.dayOfWeek === idx && styles.pillTextOn]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {frequency === "fortnightly" && rule.kind === "fortnightly" ? (
          <>
            <Sub>Anchor date (first occurrence)</Sub>
            <Input
              value={rule.anchorISO}
              onChangeText={(t) => setRule({ kind: "fortnightly", anchorISO: t })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </>
        ) : null}

        {frequency === "monthly" && rule.kind === "monthly" ? (
          <>
            <Sub>Day of month (1–28) or last day</Sub>
            <View style={styles.pills}>
              <Pressable
                onPress={() => setRule({ kind: "monthly", dayOfMonth: 1 })}
                style={[styles.pill, !rule.lastDay && (rule.dayOfMonth ?? 1) === 1 && styles.pillOn]}
              >
                <Text style={[styles.pillText, !rule.lastDay && (rule.dayOfMonth ?? 1) === 1 && styles.pillTextOn]}>
                  1st
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setRule({ kind: "monthly", dayOfMonth: 15 })}
                style={[styles.pill, !rule.lastDay && rule.dayOfMonth === 15 && styles.pillOn]}
              >
                <Text style={[styles.pillText, !rule.lastDay && rule.dayOfMonth === 15 && styles.pillTextOn]}>
                  15th
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setRule({ kind: "monthly", lastDay: true })}
                style={[styles.pill, rule.lastDay && styles.pillOn]}
              >
                <Text style={[styles.pillText, rule.lastDay && styles.pillTextOn]}>Last</Text>
              </Pressable>
            </View>

            {!rule.lastDay ? (
              <>
                <Sub style={{ marginTop: 8 }}>Custom day (1–28)</Sub>
                <Input
                  value={String(rule.dayOfMonth ?? 1)}
                  onChangeText={(t) =>
                    setRule({ kind: "monthly", dayOfMonth: Math.max(1, Math.min(28, Number(t) || 1)) })
                  }
                  keyboardType="number-pad"
                />
              </>
            ) : null}
          </>
        ) : null}
      </Card>

      <Card>
        <Label>Status</Label>
        <View style={styles.pills}>
          <Pressable onPress={() => setEnabled(true)} style={[styles.pill, enabled && styles.pillOn]}>
            <Text style={[styles.pillText, enabled && styles.pillTextOn]}>Enabled</Text>
          </Pressable>
          <Pressable onPress={() => setEnabled(false)} style={[styles.pill, !enabled && styles.pillOn]}>
            <Text style={[styles.pillText, !enabled && styles.pillTextOn]}>Disabled</Text>
          </Pressable>
        </View>
      </Card>

      <PrimaryButton title="Save" onPress={save} />
      <DangerButton title={id ? "Delete" : "Cancel"} onPress={del} />
      {!canSave ? <Sub>Enter a name and a valid amount.</Sub> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  pillOn: { backgroundColor: theme.text, borderColor: theme.text },
  pillText: { color: theme.text, fontWeight: "700" },
  pillTextOn: { color: "#FFF" },
});
