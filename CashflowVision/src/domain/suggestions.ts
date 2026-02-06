import type { CashflowEventWithBalance } from "./cashflow";

export type FixSuggestion =
  | { kind: "reduce_flow"; flowSourceId: number; amountToReduce: number; label: string }
  | { kind: "move_flow_next_day"; flowSourceId: number; label: string };

export function buildSuggestionsForDay(params: {
  dayISO: string;
  dayEvents: CashflowEventWithBalance[];
  currency: string;
}): FixSuggestion[] {
  const { dayISO, dayEvents, currency } = params;

  if (!dayEvents.length) return [];

  // Minimum balance that day
  let minBal = Infinity;
  for (const e of dayEvents) minBal = Math.min(minBal, e.balanceAfter);

  if (minBal >= 0) return [];

  const needed = Math.abs(minBal); // how much we need to add back to hit 0

  // Candidate flows on that day (savings/investment/goal/debt)
  const flows = dayEvents.filter((e) => e.type === "flow");

  const suggestions: FixSuggestion[] = [];

  if (flows.length > 0) {
    // Suggest reducing the biggest flow first
    const biggest = [...flows].sort((a, b) => b.amount - a.amount)[0];
    const reduceAmt = Math.min(biggest.amount, needed);

    suggestions.push({
      kind: "reduce_flow",
      flowSourceId: biggest.sourceId,
      amountToReduce: reduceAmt,
      label: `Reduce "${biggest.name}" by ${currency} ${reduceAmt.toFixed(2)} on ${dayISO}`,
    });

    suggestions.push({
      kind: "move_flow_next_day",
      flowSourceId: biggest.sourceId,
      label: `Move "${biggest.name}" to the next day`,
    });
  } else {
    // No flows that day → just informational suggestion
    // (Later we can allow marking expenses flexible)
    // For now we return empty and let UI show a message.
  }

  return suggestions.slice(0, 3);
}
