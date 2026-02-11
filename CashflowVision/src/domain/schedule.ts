import type { Frequency } from "./money";

export type ScheduleRule =
  | { kind: "weekly"; dayOfWeek: number } // 0=Sun ... 6=Sat
  | { kind: "fortnightly"; anchorISO: string } // first occurrence date
  | { kind: "monthly"; dayOfMonth?: number; lastDay?: boolean } // 1-28 or last day
  | { kind: "once"; dateISO: string }; // one-time occurrence date

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  // expects YYYY-MM-DD
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function startOfWeek(d: Date): Date {
  // Sunday start
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0..6
  return addDays(x, -dow);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function clampISOToRange(dateISO: string, from: Date, to: Date): string | null {
  const dt = parseISO(dateISO);
  const t = dt.getTime();
  if (t < from.getTime()) return null;
  if (t > to.getTime()) return null;
  return isoDate(dt);
}

export function generateOccurrences(
  freq: Frequency,
  rule: ScheduleRule,
  from: Date,
  to: Date
): string[] {
  const out: string[] = [];
  const fromDay = new Date(from);
  fromDay.setHours(0, 0, 0, 0);
  const toDay = new Date(to);
  toDay.setHours(0, 0, 0, 0);

  if (freq === "once") {
    if (rule.kind !== "once") return out;
    const ok = clampISOToRange(rule.dateISO, fromDay, toDay);
    if (ok) out.push(ok);
    return out;
  }

  if (freq === "weekly") {
    if (rule.kind !== "weekly") return out;
    // find first matching dow >= from
    let d = new Date(fromDay);
    while (d.getDay() !== rule.dayOfWeek) d = addDays(d, 1);
    while (d.getTime() <= toDay.getTime()) {
      out.push(isoDate(d));
      d = addDays(d, 7);
    }
    return out;
  }

  if (freq === "fortnightly") {
    if (rule.kind !== "fortnightly") return out;
    const anchor = parseISO(rule.anchorISO);
    anchor.setHours(0, 0, 0, 0);

    // move forward until >= from
    let d = new Date(anchor);
    while (d.getTime() < fromDay.getTime()) d = addDays(d, 14);

    while (d.getTime() <= toDay.getTime()) {
      out.push(isoDate(d));
      d = addDays(d, 14);
    }
    return out;
  }

  // monthly
  if (freq === "monthly") {
    if (rule.kind !== "monthly") return out;

    let d = startOfMonth(fromDay);
    const end = startOfMonth(addDays(toDay, 32)); // safe upper bound month

    while (d.getTime() <= end.getTime()) {
      let occ: Date;
      if (rule.lastDay) {
        occ = endOfMonth(d);
      } else {
        const dom = Math.max(1, Math.min(28, rule.dayOfMonth ?? 1));
        occ = new Date(d.getFullYear(), d.getMonth(), dom);
      }

      if (occ.getTime() >= fromDay.getTime() && occ.getTime() <= toDay.getTime()) {
        out.push(isoDate(occ));
      }

      // next month
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }

    return out;
  }

  return out;
}
