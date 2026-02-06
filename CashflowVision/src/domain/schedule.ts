import type { Frequency } from "./money";

export type WeeklyRule = { kind: "weekly"; dayOfWeek: number }; // 0=Sun..6=Sat
export type FortnightlyRule = { kind: "fortnightly"; anchorISO: string }; // YYYY-MM-DD
export type MonthlyRule = { kind: "monthly"; dayOfMonth?: number; lastDay?: boolean };

export type ScheduleRule = WeeklyRule | FortnightlyRule | MonthlyRule;

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const diff = d.getDay(); // 0..6
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function daysInMonth(date: Date): number {
  return endOfMonth(date).getDate();
}

export function generateOccurrences(
  frequency: Frequency,
  rule: ScheduleRule,
  from: Date,
  to: Date
): string[] {
  const out: string[] = [];
  const fromDay = new Date(from);
  fromDay.setHours(0, 0, 0, 0);
  const toDay = new Date(to);
  toDay.setHours(0, 0, 0, 0);

  if (frequency === "weekly" && rule.kind === "weekly") {
    // first matching day
    let cursor = new Date(fromDay);
    while (cursor.getDay() !== rule.dayOfWeek) cursor = addDays(cursor, 1);
    while (cursor <= toDay) {
      out.push(isoDate(cursor));
      cursor = addDays(cursor, 7);
    }
    return out;
  }

  if (frequency === "fortnightly" && rule.kind === "fortnightly") {
    let cursor = parseISO(rule.anchorISO);
    cursor.setHours(0, 0, 0, 0);
    while (cursor < fromDay) cursor = addDays(cursor, 14);
    while (cursor <= toDay) {
      out.push(isoDate(cursor));
      cursor = addDays(cursor, 14);
    }
    return out;
  }

  if (frequency === "monthly" && rule.kind === "monthly") {
    const cursor = new Date(fromDay.getFullYear(), fromDay.getMonth(), 1);
    const endCursor = new Date(toDay.getFullYear(), toDay.getMonth(), 1);

    while (cursor <= endCursor) {
      const dim = daysInMonth(cursor);
      let day = 1;

      if (rule.lastDay) day = dim;
      else if (rule.dayOfMonth) day = Math.min(Math.max(rule.dayOfMonth, 1), 28);
      else day = 1;

      const occ = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      if (occ >= fromDay && occ <= toDay) out.push(isoDate(occ));

      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }

  return out;
}
