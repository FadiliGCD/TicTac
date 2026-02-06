import type { IncomeRow, ExpenseRow, FlowRow, SettingsRow } from "../db/repo";
import type { CashflowEvent } from "./cashflow";
import { applyRunningBalance } from "./cashflow";
import type { ScheduleRule } from "./schedule";
import { generateOccurrences } from "./schedule";

function safeParseRule(rule_json: string): ScheduleRule {
  try {
    return JSON.parse(rule_json) as ScheduleRule;
  } catch {
    return { kind: "monthly", dayOfMonth: 1 };
  }
}

export function buildCashflow(params: {
  settings: SettingsRow;
  incomes: IncomeRow[];
  expenses: ExpenseRow[];
  flows: FlowRow[];
  from: Date;
  to: Date;
}) {
  const { settings, incomes, expenses, flows, from, to } = params;

  const events: CashflowEvent[] = [];

  for (const inc of incomes.filter((x) => x.enabled === 1)) {
    const rule = safeParseRule(inc.rule_json);
    const dates = generateOccurrences(inc.frequency, rule, from, to);
    for (const d of dates) {
      events.push({
        id: `inc-${inc.id}-${d}`,
        dateISO: d,
        type: "income",
        name: inc.name,
        amount: inc.amount,
      });
    }
  }

  for (const ex of expenses.filter((x) => x.enabled === 1)) {
    const rule = safeParseRule(ex.rule_json);
    const dates = generateOccurrences(ex.frequency, rule, from, to);
    for (const d of dates) {
      events.push({
        id: `exp-${ex.id}-${d}`,
        dateISO: d,
        type: "expense",
        name: ex.name,
        amount: ex.amount,
        category: ex.category,
      });
    }
  }

  for (const fl of flows.filter((x) => x.enabled === 1)) {
    const rule = safeParseRule(fl.rule_json);
    const dates = generateOccurrences(fl.frequency, rule, from, to);
    for (const d of dates) {
      events.push({
        id: `flow-${fl.id}-${d}`,
        dateISO: d,
        type: "flow",
        name: fl.name,
        amount: fl.amount,
        flowType: fl.flow_type,
      });
    }
  }

  const withBalance = applyRunningBalance(events, settings.starting_balance);
  return { events, withBalance };
}
