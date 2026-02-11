import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import * as d3 from "d3-shape";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Screen, Card, Title, Label, Row, Sub } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";
import { useRepo } from "../../src/db/repo";
import { buildCashflow } from "../../src/domain/cashflowBuilder";
import { addDays, startOfMonth } from "../../src/domain/schedule";
import { round2 } from "../../src/domain/money";

type Slice = { key: string; value: number; color: string };

const KEY_DASH_MONTH = "tictac:dashboardMonth"; // YYYY-MM

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function ym(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function dateFromYM(ymStr: string): Date {
  // ymStr = YYYY-MM
  const [y, m] = ymStr.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, 1);
}

export default function Dashboard() {
  const repo = useRepo();

  const [settings, setSettings] = useState<any>(null);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);

  const [dashMonth, setDashMonth] = useState<string | null>(null); // YYYY-MM

  useEffect(() => {
    (async () => {
      const m = await AsyncStorage.getItem(KEY_DASH_MONTH);
      setDashMonth(m); // can be null
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

  const currency = settings?.currency ?? "EUR";

  const monthStart = useMemo(() => {
    if (dashMonth) return startOfMonth(dateFromYM(dashMonth));
    return startOfMonth(new Date());
  }, [dashMonth]);

  const monthModel = useMemo(() => {
    if (!settings) return null;

    const monthFrom = startOfMonth(monthStart);
    const monthTo = endOfMonth(monthStart);

    // look back 1 year to get realistic carryover
    const lookbackFrom = new Date(monthFrom);
    lookbackFrom.setFullYear(lookbackFrom.getFullYear() - 1);

    const prevTo = addDays(monthFrom, -1);

    const prevBuilt = buildCashflow({
      settings,
      incomes,
      expenses,
      flows,
      from: lookbackFrom,
      to: prevTo,
    });

    const carryover =
      prevBuilt.withBalance.length > 0
        ? prevBuilt.withBalance[prevBuilt.withBalance.length - 1].balanceAfter
        : settings.starting_balance;

    const monthSettings = { ...settings, starting_balance: carryover };

    const monthBuilt = buildCashflow({
      settings: monthSettings,
      incomes,
      expenses,
      flows,
      from: monthFrom,
      to: monthTo,
    });

    let incomeTotal = 0;
    let expenseTotal = 0;
    let flowTotal = 0;

    for (const e of monthBuilt.events) {
      if (e.type === "income") incomeTotal += e.amount;
      else if (e.type === "expense") expenseTotal += e.amount;
      else flowTotal += e.amount;
    }

    incomeTotal = round2(incomeTotal);
    expenseTotal = round2(expenseTotal);
    flowTotal = round2(flowTotal);

    const available = round2(carryover + incomeTotal);
    const allocated = round2(expenseTotal + flowTotal);

    const remaining = round2(Math.max(0, available - allocated));
    const deficit = round2(Math.max(0, allocated - available));

    const endBalance = round2(carryover + incomeTotal - expenseTotal - flowTotal);

    return {
      monthFrom,
      monthTo,
      carryover: round2(carryover),
      incomeTotal,
      expenseTotal,
      flowTotal,
      available,
      allocated,
      remaining,
      deficit,
      endBalance,
    };
  }, [settings, incomes, expenses, flows, monthStart]);

  const pieSlices: Slice[] = useMemo(() => {
    if (!monthModel) return [];
    return [
      { key: "Expenses", value: Math.max(0, monthModel.expenseTotal), color: "#FF3B30" },
      { key: "Savings/Investments", value: Math.max(0, monthModel.flowTotal), color: "#AF52DE" },
      { key: "Remaining", value: Math.max(0, monthModel.remaining), color: "#34C759" },
      { key: "Deficit", value: Math.max(0, monthModel.deficit), color: "#FF9500" },
    ].filter((x) => x.value > 0.00001);
  }, [monthModel]);

  const donut = useMemo(() => {
    const size = 220;
    const rOuter = 90;
    const rInner = 55;

    if (!pieSlices.length) return null;

    const total = pieSlices.reduce((s, x) => s + x.value, 0);
    if (total <= 0) return null;

    const pieGen = d3.pie<Slice>().value((d) => d.value).sort(null);
    const arcs = pieGen(pieSlices);

    const arcPath = d3.arc<d3.PieArcDatum<Slice>>().innerRadius(rInner).outerRadius(rOuter);
    const arcLabel = d3
      .arc<d3.PieArcDatum<Slice>>()
      .innerRadius((rInner + rOuter) / 2)
      .outerRadius((rInner + rOuter) / 2);

    const paths = arcs.map((a) => {
      const [lx, ly] = arcLabel.centroid(a);
      const pct = (a.data.value / total) * 100;
      const showLabel = pct >= 6;

      return {
        key: a.data.key,
        d: arcPath(a) ?? "",
        color: a.data.color,
        value: a.data.value,
        label: `${Math.round(pct)}%`,
        lx,
        ly,
        showLabel,
      };
    });

    return { size, paths };
  }, [pieSlices]);

  const projectionEndBalance = useMemo(() => {
    if (!settings) return null;

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 90);

    const built = buildCashflow({ settings, incomes, expenses, flows, from, to });
    const endBal = built.withBalance.length
      ? built.withBalance[built.withBalance.length - 1].balanceAfter
      : settings.starting_balance;

    return endBal;
  }, [settings, incomes, expenses, flows]);

  if (!settings || !monthModel || projectionEndBalance == null) {
    return (
      <Screen>
        <Title>Dashboard</Title>
        <Sub>Loading…</Sub>
      </Screen>
    );
  }

  const monthName = monthModel.monthFrom.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <Screen>
      <Title>Dashboard</Title>

      <Card>
        <Label>{monthName} — Monthly window</Label>
        <Sub style={{ marginTop: 2 }}>Available = Carryover + Income (includes one-time).</Sub>

        {!donut ? (
          <Sub style={{ marginTop: 10 }}>No data yet. Add items to see the chart.</Sub>
        ) : (
          <>
            <View style={styles.chartWrap}>
              <Svg width={donut.size} height={donut.size}>
                <G x={donut.size / 2} y={donut.size / 2}>
                  {donut.paths.map((p) => (
                    <Path key={p.key} d={p.d} fill={p.color} />
                  ))}
                  {donut.paths.map((p) =>
                    p.showLabel ? (
                      <SvgText
                        key={`${p.key}-label`}
                        x={p.lx}
                        y={p.ly}
                        fontSize={12}
                        fontWeight="800"
                        fill="#FFFFFF"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {p.label}
                      </SvgText>
                    ) : null
                  )}
                </G>
              </Svg>
            </View>

            <View style={{ marginTop: 10, gap: 8 }}>
              {pieSlices.map((x) => (
                <View key={x.key} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: x.color }]} />
                  <Text style={styles.legendText}>{x.key}</Text>
                  <Text style={styles.legendValue}>
                    {currency} {x.value.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {monthModel.deficit > 0 ? (
              <Sub style={{ marginTop: 10, color: "#FF9500" }}>
                You’re over-allocated by {currency} {monthModel.deficit.toFixed(2)} this month.
              </Sub>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <Label>This month breakdown</Label>
        <Row left={<Sub>Carryover</Sub>} right={<Sub>{currency} {monthModel.carryover.toFixed(2)}</Sub>} />
        <Row left={<Sub>Income</Sub>} right={<Sub>{currency} {monthModel.incomeTotal.toFixed(2)}</Sub>} />
        <Row left={<Sub>Available</Sub>} right={<Sub>{currency} {monthModel.available.toFixed(2)}</Sub>} />
        <View style={{ height: 10 }} />
        <Row left={<Sub>Expenses</Sub>} right={<Sub>{currency} {monthModel.expenseTotal.toFixed(2)}</Sub>} />
        <Row left={<Sub>Flows</Sub>} right={<Sub>{currency} {monthModel.flowTotal.toFixed(2)}</Sub>} />
        <View style={{ height: 10 }} />
        <Row left={<Sub>End-of-month balance</Sub>} right={<Sub>{currency} {monthModel.endBalance.toFixed(2)}</Sub>} />
      </Card>

      <Card>
        <Label>Projection (next 90 days)</Label>
        <Row left={<Sub>End balance</Sub>} right={<Sub>{currency} {projectionEndBalance.toFixed(2)}</Sub>} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartWrap: { alignItems: "center", justifyContent: "center", marginTop: 8 },
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { flex: 1, color: theme.text, fontWeight: "600" },
  legendValue: { color: theme.subtext, fontWeight: "700" },
});
