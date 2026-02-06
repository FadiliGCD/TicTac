import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Card, Title, Label, Sub } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";
import { useRepo } from "../../src/db/repo";
import { buildCashflow } from "../../src/domain/cashflowBuilder";
import { groupByDate } from "../../src/domain/cashflow";
import { addDays, isoDate, startOfMonth, startOfWeek } from "../../src/domain/schedule";
import { buildSuggestionsForDay } from "../../src/domain/suggestions";

type ViewMode = "month" | "week";

export default function CalendarScreen() {
  const repo = useRepo();
  const router = useRouter();

  const [settings, setSettings] = useState<any>(null);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [mode, setMode] = useState<ViewMode>("month");

  const [cursor, setCursor] = useState(() => new Date());
  const [selectedISO, setSelectedISO] = useState(() => isoDate(new Date()));

  useEffect(() => {
    const load = async () => {
      setSettings(await repo.getSettings());
      setIncomes(await repo.listIncome());
      setExpenses(await repo.listExpenses());
      setFlows(await repo.listFlows());
    };
    load();
  }, []);

  const windowRange = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 90);
    return { from, to };
  }, []);

  const built = useMemo(() => {
    if (!settings) return null;
    return buildCashflow({ settings, incomes, expenses, flows, ...windowRange });
  }, [settings, incomes, expenses, flows, windowRange]);

  const byDate = useMemo(() => {
    if (!built) return {};
    return groupByDate(built.withBalance);
  }, [built]);

  // Risk days map: dayISO -> minimum balance that day (only if < 0)
  const riskMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!built) return map;

    for (const e of built.withBalance) {
      const d = e.dateISO;
      const currentMin = map[d];
      const nextMin = currentMin == null ? e.balanceAfter : Math.min(currentMin, e.balanceAfter);
      map[d] = nextMin;
    }

    for (const k of Object.keys(map)) {
      if (map[k] >= 0) delete map[k];
    }

    return map;
  }, [built]);

  const riskList = useMemo(() => {
    return Object.entries(riskMap)
      .map(([dateISO, minBal]) => ({ dateISO, minBal }))
      .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
  }, [riskMap]);

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    return cells;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  // ✅ Derived values (safe even if built/settings null)
  const currency = settings?.currency ?? "EUR";
  const selectedEvents = (byDate as any)[selectedISO] ?? [];
  const selectedBal =
    selectedEvents.length > 0 ? selectedEvents[selectedEvents.length - 1].balanceAfter : undefined;

  const selectedDayMin = riskMap[selectedISO]; // undefined if not risky

  const suggestions = useMemo(() => {
    // safe: if no events, returns []
    return buildSuggestionsForDay({
      dayISO: selectedISO,
      dayEvents: selectedEvents,
      currency,
    });
  }, [selectedISO, selectedEvents, currency]);

  function changeMonth(delta: number) {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + delta);
    setCursor(d);
  }

  function changeWeek(delta: number) {
    setCursor(addDays(cursor, delta * 7));
  }

  // ✅ Now it's safe to early-return (no hooks below)
  if (!settings || !built) {
    return (
      <Screen>
        <Title>Calendar</Title>
        <Sub>Loading…</Sub>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Calendar</Title>

      {/* Risk summary */}
      {riskList.length > 0 ? (
        <Card>
          <Label>Risk days (balance below 0)</Label>
          <Sub>
            {riskList.length} day{riskList.length === 1 ? "" : "s"} in next 90 days
          </Sub>

          <View style={{ marginTop: 8, gap: 6 }}>
            {riskList.slice(0, 6).map((r) => (
              <Pressable
                key={r.dateISO}
                onPress={() => setSelectedISO(r.dateISO)}
                style={styles.riskRow}
              >
                <Text style={styles.riskDate}>{r.dateISO}</Text>
                <Text style={styles.riskBal}>
                  Min: {currency} {r.minBal.toFixed(2)}
                </Text>
              </Pressable>
            ))}

            {riskList.length > 6 ? (
              <Sub style={{ marginTop: 6 }}>
                Showing 6 of {riskList.length}. Tap a day in the calendar for details.
              </Sub>
            ) : null}
          </View>
        </Card>
      ) : (
        <Card>
          <Label>Risk days</Label>
          <Sub>No negative-balance days in the next 90 days ✅</Sub>
        </Card>
      )}

      <Card>
        <View style={styles.toggleRow}>
          <Pressable onPress={() => setMode("month")} style={[styles.pill, mode === "month" && styles.pillOn]}>
            <Text style={[styles.pillText, mode === "month" && styles.pillTextOn]}>Month</Text>
          </Pressable>
          <Pressable onPress={() => setMode("week")} style={[styles.pill, mode === "week" && styles.pillOn]}>
            <Text style={[styles.pillText, mode === "week" && styles.pillTextOn]}>Week</Text>
          </Pressable>
        </View>

        <View style={styles.navRow}>
          <Pressable onPress={() => (mode === "month" ? changeMonth(-1) : changeWeek(-1))}>
            <Text style={styles.navBtn}>‹</Text>
          </Pressable>
          <Text style={styles.navTitle}>
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </Text>
          <Pressable onPress={() => (mode === "month" ? changeMonth(1) : changeWeek(1))}>
            <Text style={styles.navBtn}>›</Text>
          </Pressable>
        </View>

        {mode === "month" ? (
          <View style={styles.grid}>
            {grid.map((d) => {
              const iso = isoDate(d);
              const isThisMonth = d.getMonth() === cursor.getMonth();
              const isSelected = iso === selectedISO;
              const items = (byDate as any)[iso] ?? [];
              const dayNet = items.reduce((s: number, e: any) => s + e.signedAmount, 0);
              const isRisk = riskMap[iso] != null;

              return (
                <Pressable
                  key={iso}
                  onPress={() => setSelectedISO(iso)}
                  style={[
                    styles.cell,
                    !isThisMonth && styles.cellDim,
                    isSelected && styles.cellSelected,
                    isRisk && styles.cellRisk,
                  ]}
                >
                  <View style={styles.cellTop}>
                    <Text style={[styles.dayNum, !isThisMonth && styles.dimText]}>{d.getDate()}</Text>
                    {isRisk ? <View style={styles.riskDot} /> : null}
                  </View>

                  {items.length > 0 ? (
                    <Text style={styles.netText}>
                      {dayNet >= 0 ? "+" : ""}
                      {dayNet.toFixed(0)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.weekRow}>
            {weekDays.map((d) => {
              const iso = isoDate(d);
              const isSelected = iso === selectedISO;
              const items = (byDate as any)[iso] ?? [];
              const isRisk = riskMap[iso] != null;

              return (
                <Pressable
                  key={iso}
                  onPress={() => setSelectedISO(iso)}
                  style={[
                    styles.weekCell,
                    isSelected && styles.cellSelected,
                    isRisk && styles.weekRisk,
                  ]}
                >
                  <Text style={styles.weekDow}>{d.toLocaleString(undefined, { weekday: "short" })}</Text>
                  <Text style={styles.weekNum}>{d.getDate()}</Text>
                  {items.length > 0 ? (
                    <View style={isRisk ? styles.dotRisk : styles.dot} />
                  ) : (
                    <View style={styles.dotOff} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      <Card>
        <Label>{selectedISO}</Label>

        {selectedDayMin != null ? (
          <Sub style={{ color: theme.danger }}>
            Risk day: balance dropped to {currency} {selectedDayMin.toFixed(2)}
          </Sub>
        ) : null}

        {typeof selectedBal === "number" ? (
          <Sub>
            Balance after last event: {currency} {selectedBal.toFixed(2)}
          </Sub>
        ) : (
          <Sub>No events.</Sub>
        )}

        {selectedDayMin != null ? (
          <>
            <Label style={{ marginTop: 10 }}>Fix suggestions</Label>
            {suggestions.length > 0 ? (
              <View style={{ marginTop: 8, gap: 8 }}>
                {suggestions.map((s: any, idx: number) => (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      router.push({ pathname: "/flows/edit", params: { id: String(s.flowSourceId) } });
                    }}
                    style={styles.suggestionRow}
                  >
                    <Text style={styles.suggestionTitle}>{s.label}</Text>
                    <Text style={styles.suggestionSub}>Tap to edit that flow</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Sub style={{ marginTop: 6 }}>
                No editable flows on this day. (Next: allow “flexible” expenses.)
              </Sub>
            )}
          </>
        ) : null}
      </Card>

      <Card>
        <Label>Events</Label>
        <ScrollView style={{ maxHeight: 260 }}>
          {selectedEvents.map((e: any) => (
            <Pressable
              key={e.id}
              onPress={() => {
                if (e.type === "income") router.push({ pathname: "/income/edit", params: { id: String(e.sourceId) } });
                if (e.type === "expense") router.push({ pathname: "/expenses/edit", params: { id: String(e.sourceId) } });
                if (e.type === "flow") router.push({ pathname: "/flows/edit", params: { id: String(e.sourceId) } });
              }}
              style={styles.eventRow}
            >
              <Text style={styles.eventName}>{e.name}</Text>
              <Text style={[styles.eventAmt, e.signedAmount < 0 && { color: theme.danger }]}>
                {e.signedAmount >= 0 ? "+" : ""}
                {currency} {e.signedAmount.toFixed(2)}
              </Text>
              <Text style={styles.eventBal}>
                → {currency} {e.balanceAfter.toFixed(2)}
              </Text>
              <Text style={styles.eventHint}>Tap to edit</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      <Sub style={{ marginTop: 4 }}>Projection window: next 90 days.</Sub>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  pillOn: { backgroundColor: theme.text, borderColor: theme.text },
  pillText: { color: theme.text, fontWeight: "600" },
  pillTextOn: { color: "#FFF" },

  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  navBtn: { fontSize: 28, color: theme.tint, paddingHorizontal: 6 },
  navTitle: { fontSize: 16, fontWeight: "700", color: theme.text },

  grid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.2857%",
    aspectRatio: 1,
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "space-between",
  },
  cellDim: { opacity: 0.45 },
  cellSelected: { borderColor: theme.tint, backgroundColor: "#F0F8FF" },
  cellRisk: { backgroundColor: "#FFF5F5" },

  cellTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  riskDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.danger },

  dayNum: { fontWeight: "700", color: theme.text },
  dimText: { color: theme.subtext },
  netText: { fontSize: 12, color: theme.subtext },

  weekRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  weekCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  weekRisk: { backgroundColor: "#FFF5F5", borderColor: "#FECACA" },
  weekDow: { color: theme.subtext, fontSize: 12, fontWeight: "600" },
  weekNum: { color: theme.text, fontSize: 16, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.tint, marginTop: 6 },
  dotRisk: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.danger, marginTop: 6 },
  dotOff: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.line, marginTop: 6 },

  riskRow: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  riskDate: { color: theme.text, fontWeight: "700" },
  riskBal: { color: theme.danger, fontWeight: "700" },

  suggestionRow: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#FFF",
  },
  suggestionTitle: { color: theme.text, fontWeight: "700" },
  suggestionSub: { color: theme.subtext, marginTop: 4 },

  eventRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.line },
  eventName: { color: theme.text, fontWeight: "600" },
  eventAmt: { color: theme.tint, marginTop: 2, fontWeight: "600" },
  eventBal: { color: theme.subtext, marginTop: 2 },
  eventHint: { color: theme.subtext, marginTop: 4 },
});
