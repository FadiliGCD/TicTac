import { round2 } from "./money";

export type EventType = "income" | "expense" | "flow";

export type CashflowEvent = {
  id: string;
  dateISO: string;
  type: EventType;
  name: string;
  amount: number;
  category?: string;
  flowType?: string;

  sourceId: number; // <-- REQUIRED
};

export type CashflowEventWithBalance = CashflowEvent & {
  signedAmount: number;
  balanceAfter: number;
};

export function eventSortOrder(a: CashflowEvent, b: CashflowEvent): number {
  if (a.dateISO !== b.dateISO) return a.dateISO < b.dateISO ? -1 : 1;

  const rank = (t: EventType) => (t === "income" ? 0 : t === "expense" ? 1 : 2);
  const ra = rank(a.type);
  const rb = rank(b.type);
  if (ra !== rb) return ra - rb;

  return a.name.localeCompare(b.name);
}

export function applyRunningBalance(
  events: CashflowEvent[],
  startingBalance: number
): CashflowEventWithBalance[] {
  const sorted = [...events].sort(eventSortOrder);
  let bal = startingBalance;

  return sorted.map((e) => {
    const signed = e.type === "income" ? e.amount : -e.amount;
    bal = round2(bal + signed);
    return { ...e, signedAmount: signed, balanceAfter: bal };
  });
}

export function sumByType(events: CashflowEvent[]): {
  income: number;
  expense: number;
  flow: number;
  net: number;
} {
  let income = 0,
    expense = 0,
    flow = 0;

  for (const e of events) {
    if (e.type === "income") income += e.amount;
    else if (e.type === "expense") expense += e.amount;
    else flow += e.amount;
  }
  const net = income - expense - flow;
  return { income: round2(income), expense: round2(expense), flow: round2(flow), net: round2(net) };
}

export function groupByDate<T extends { dateISO: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, it) => {
    (acc[it.dateISO] ||= []).push(it);
    return acc;
  }, {});
}
