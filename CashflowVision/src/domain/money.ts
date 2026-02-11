export type Frequency = "weekly" | "fortnightly" | "monthly" | "once";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toYearly(amount: number, freq: Frequency): number {
  switch (freq) {
    case "weekly":
      return amount * 52;
    case "fortnightly":
      return amount * 26;
    case "monthly":
      return amount * 12;
    case "once":
      // one-time items should NOT count as recurring yearly totals
      return 0;
    default:
      return 0;
  }
}

export function fromYearly(yearly: number, base: Frequency): number {
  switch (base) {
    case "weekly":
      return yearly / 52;
    case "fortnightly":
      return yearly / 26;
    case "monthly":
      return yearly / 12;
    case "once":
      // not meaningful as a base period; keep safe
      return 0;
    default:
      return 0;
  }
}
