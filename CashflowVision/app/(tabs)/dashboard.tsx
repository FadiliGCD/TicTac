import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import * as d3 from "d3-shape";

import { Screen, Card, Title, Label, Row, Sub } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";
import { useRepo } from "../../src/db/repo";
import { buildCashflow } from "../../src/domain/cashflowBuilder";
import { fromYearly, toYearly, round2 } from "../../src/domain/money";

type Slice = { key: string; value: number; color: string };

export default function Dashboard() {
  const repo = useRepo();

  const [settings, setSettings] = useState<any>(null);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setSettings(await repo.getSettings());
      setIncomes(await repo.listIncome());
      setExpenses(await repo.listExpenses());
      setFlows(await repo.listFlows());
    };
    load();
  }, []);

  const base = settings?.base_frequency ?? "monthly";
  const currency = settings?.currency ?? "EUR";

  const perBaseTotals = useMemo(() => {
    if (!settings) return null;

    const incomeYearly = incomes
      .filter((x) => x.enabled === 1)
      .reduce((s, x) => s + toYearly(x.amount, x.frequency), 0);

    const expenseYearly = expenses
      .filter((x) => x.enabled === 1)
      .reduce((s, x) => s + toYearly(x.amount, x.frequency), 0);

    const flowYearly = flows
      .filter((x) => x.enabled === 1)
      .reduce((s, x) => s + toYearly(x.amount, x.frequency), 0);

    const income = round2(fromYearly(incomeYearly, base));
    const expense = round2(fromYearly(expenseYearly, base));
    const flow = round2(fromYearly(flowYearly, base));
    const net = round2(income - expense - flow);

    return { income, expense, flow, net };
  }, [settings, incomes, expenses, flows, base]);

  // Keep only end balance projection
  const projectionEndBalance = useMemo(() => {
    if (!settings) return null;
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 90);

    const built = buildCashflow({ settings, incomes, expenses, flows, from, to });
    const endBalance = built.withBalance.length
      ? built.withBalance[built.withBalance.length - 1].balanceAfter
      : settings.starting_balance;

    return endBalance;
  }, [settings, incomes, expenses, flows]);

  const pieSlices: Slice[] = useMemo(() => {
    if (!perBaseTotals) return [];

    const expense = Math.max(0, perBaseTotals.expense);
    const flow = Math.max(0, perBaseTotals.flow);
    const remaining = perBaseTotals.net >= 0 ? perBaseTotals.net : 0;
    const deficit = perBaseTotals.net < 0 ? Math.abs(perBaseTotals.net) : 0;

    return [
      { key: "Fixed Expenses", value: expense, color: "#FF3B30" },
      { key: "Savings/Investments", value: flow, color: "#AF52DE" },
      { key: "Remaining", value: remaining, color: "#34C759" },
      { key: "Deficit", value: deficit, color: "#FF9500" },
    ].filter((x) => x.value > 0.00001);
  }, [perBaseTotals]);

  // Build donut paths + label positions
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

    // Put labels roughly in the middle of the ring
    const arcLabel = d3
      .arc<d3.PieArcDatum<Slice>>()
      .innerRadius((rInner + rOuter) / 2)
      .outerRadius((rInner + rOuter) / 2);

    const paths = arcs.map((a) => {
      const [lx, ly] = arcLabel.centroid(a);
      const pct = (a.data.value / total) * 100;

      // Hide label for tiny slices (looks messy)
      const showLabel = pct >= 6; // tweak threshold if you want

      return {
        key: a.data.key,
        d: arcPath(a) ?? "",
        color: a.data.color,
        value: a.data.value,
        pct,
        label: `${Math.round(pct)}%`,
        lx,
        ly,
        showLabel,
      };
    });

    return { size, total, paths };
  }, [pieSlices]);

  if (!settings || !perBaseTotals || projectionEndBalance == null) {
    return (
      <Screen>
        <Title>Dashboard</Title>
        <Sub>Loading…</Sub>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Dashboard</Title>

      <Card>
        <Label>Projection (next 90 days)</Label>
        <Row
          left={<Sub>End balance</Sub>}
          right={<Sub>{currency} {projectionEndBalance.toFixed(2)}</Sub>}
        />
      </Card>

      <Card>
        <Label>Per {base}</Label>
        <Row left={<Sub>Income</Sub>} right={<Sub>{currency} {perBaseTotals.income.toFixed(2)}</Sub>} />
        <Row left={<Sub>Fixed expenses</Sub>} right={<Sub>{currency} {perBaseTotals.expense.toFixed(2)}</Sub>} />
        <Row left={<Sub>Savings / Investments / Flows</Sub>} right={<Sub>{currency} {perBaseTotals.flow.toFixed(2)}</Sub>} />
        <Row left={<Sub>Net remaining</Sub>} right={<Sub>{currency} {perBaseTotals.net.toFixed(2)}</Sub>} />
      </Card>

      <Card>
        <Label>Where your money goes</Label>

        {!donut ? (
          <Sub>No data yet. Add income/expenses/flows to see the chart.</Sub>
        ) : (
          <>
            <View style={styles.chartWrap}>
              <Svg width={donut.size} height={donut.size}>
                <G x={donut.size / 2} y={donut.size / 2}>
                  {donut.paths.map((p) => (
                    <Path key={p.key} d={p.d} fill={p.color} />
                  ))}

                  {/* Percent labels */}
                  {donut.paths.map((p) =>
                    p.showLabel ? (
                      <SvgText
                        key={`${p.key}-label`}
                        x={p.lx}
                        y={p.ly}
                        fontSize={12}
                        fontWeight="700"
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

            {perBaseTotals.net < 0 ? (
              <Sub style={{ marginTop: 10, color: "#FF9500" }}>
                You’re over-allocated by {currency} {Math.abs(perBaseTotals.net).toFixed(2)} per {base}.
              </Sub>
            ) : null}

            <Sub style={{ marginTop: 8 }}>
              Percent labels hide automatically for very small slices.
            </Sub>
          </>
        )}
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
