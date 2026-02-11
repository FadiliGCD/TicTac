import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  Screen,
  Card,
  Title,
  Label,
  Sub,
  Row,
  PrimaryButton,
  DangerButton,
} from "../../src/ui/components";
import { theme } from "../../src/ui/theme";
import { useRepo } from "../../src/db/repo";
import { buildCashflow } from "../../src/domain/cashflowBuilder";
import { addDays, startOfMonth } from "../../src/domain/schedule";

const KEY_DASH_MONTH = "tictac:dashboardMonth"; // YYYY-MM

// ✅ Updated for latest expo-notifications types
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function ym(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function dateFromYM(ymStr: string): Date {
  const [y, m] = ymStr.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export default function ToolsScreen() {
  const repo = useRepo();

  const [dashMonth, setDashMonth] = useState<string>(ym(new Date())); // YYYY-MM
  const [loaded, setLoaded] = useState(false);

  const [settings, setSettings] = useState<any>(null);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(KEY_DASH_MONTH);
      if (saved) setDashMonth(saved);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      setSettings(await repo.getSettings());
      setIncomes(await repo.listIncome());
      setExpenses(await repo.listExpenses());
      setFlows(await repo.listFlows());
    };
    load();
  }, []);

  const monthDate = useMemo(() => startOfMonth(dateFromYM(dashMonth)), [dashMonth]);
  const monthTitle = useMemo(
    () => monthDate.toLocaleString(undefined, { month: "long", year: "numeric" }),
    [monthDate]
  );

  async function saveDashMonth(nextYM: string) {
    setDashMonth(nextYM);
    await AsyncStorage.setItem(KEY_DASH_MONTH, nextYM);
  }

  async function resetToCurrentMonth() {
    await saveDashMonth(ym(new Date()));
  }

  async function ensureNotifPermission(): Promise<boolean> {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === "granted") return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  }

  async function cancelAllNotifs() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    Alert.alert("Done", "All scheduled notifications were cleared.");
  }

  // Schedules upcoming EXPENSE reminders for next 30 days (9:00 AM on the day)
  async function scheduleUpcomingExpenses() {
    if (!settings) return;

    const ok = await ensureNotifPermission();
    if (!ok) {
      Alert.alert("Notifications disabled", "Enable notifications in iOS Settings to use reminders.");
      return;
    }

    // Clear previous scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);

    const built = buildCashflow({ settings, incomes, expenses, flows, from, to });
    const expenseEvents = built.events.filter((e) => e.type === "expense");

    const now = new Date();
    let count = 0;

    for (const ev of expenseEvents) {
      const [y, m, d] = ev.dateISO.split("-").map((x) => Number(x));
      const triggerDate = new Date(y, (m || 1) - 1, d || 1, 9, 0, 0);

      if (triggerDate.getTime() <= now.getTime()) continue;

      // ✅ Correct trigger type for TypeScript
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Upcoming expense",
          body: `${ev.name} • ${settings.currency} ${ev.amount.toFixed(2)}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      count++;
      if (count >= 64) break;
    }

    Alert.alert("Scheduled", `Scheduled ${count} expense reminder(s) for the next 30 days.`);
  }

  async function exportMonthCSV() {
    if (!settings) return;

    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);

    // Look back 1 year to compute carryover realistically
    const lookbackFrom = new Date(from);
    lookbackFrom.setFullYear(lookbackFrom.getFullYear() - 1);
    const prevTo = addDays(from, -1);

    const prevBuilt = buildCashflow({ settings, incomes, expenses, flows, from: lookbackFrom, to: prevTo });
    const carryover =
      prevBuilt.withBalance.length > 0
        ? prevBuilt.withBalance[prevBuilt.withBalance.length - 1].balanceAfter
        : settings.starting_balance;

    const monthSettings = { ...settings, starting_balance: carryover };
    const monthBuilt = buildCashflow({ settings: monthSettings, incomes, expenses, flows, from, to });

    const header = "date,type,name,amount,signedAmount,balanceAfter";
    const rows = monthBuilt.withBalance.map((e) => {
      const safeName = `"${String(e.name).replace(/"/g, '""')}"`;
      return [
        e.dateISO,
        e.type,
        safeName,
        e.amount.toFixed(2),
        e.signedAmount.toFixed(2),
        e.balanceAfter.toFixed(2),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    // ✅ Legacy FS has cacheDirectory + EncodingType
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!baseDir) {
      Alert.alert("Export failed", "No writable directory available.");
      return;
    }

    const filename = `tictac-${dashMonth}.csv`;
    const path = baseDir + filename;

    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Saved", `CSV saved to:\n${path}`);
      return;
    }

    await Sharing.shareAsync(path, {
      dialogTitle: `Export ${dashMonth}`,
      mimeType: "text/csv",
    });
  }

  if (!loaded) {
    return (
      <Screen>
        <Title>Tools</Title>
        <Sub>Loading…</Sub>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Tools</Title>

      <Card>
        <Label>Dashboard month</Label>
        <Sub>The Dashboard pie uses this month window.</Sub>

        <Row
          left={<Sub style={{ fontWeight: "700", color: theme.text }}>{monthTitle}</Sub>}
          right={
            <View style={styles.monthBtns}>
              <Pressable
                onPress={() => saveDashMonth(ym(addMonths(monthDate, -1)))}
                style={styles.smallBtn}
              >
                <Text style={styles.smallBtnText}>‹</Text>
              </Pressable>
              <Pressable
                onPress={() => saveDashMonth(ym(addMonths(monthDate, +1)))}
                style={styles.smallBtn}
              >
                <Text style={styles.smallBtnText}>›</Text>
              </Pressable>
            </View>
          }
        />

        <PrimaryButton title="Reset to current month" onPress={resetToCurrentMonth} />
      </Card>

      <Card>
        <Label>Notifications</Label>
        <Sub>Local reminders for upcoming expenses (next 30 days).</Sub>

        <PrimaryButton title="Enable & schedule reminders" onPress={scheduleUpcomingExpenses} />
        <DangerButton title="Clear scheduled reminders" onPress={cancelAllNotifs} />
      </Card>

      <Card>
        <Label>Export</Label>
        <Sub>Export the selected month window as CSV and share it.</Sub>

        <PrimaryButton title={`Export ${dashMonth} CSV`} onPress={exportMonthCSV} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  smallBtn: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF",
  },
  smallBtnText: { fontSize: 18, fontWeight: "800", color: theme.text },
});
