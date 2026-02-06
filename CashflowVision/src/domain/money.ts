export type Frequency = "weekly" | "fortnightly" | "monthly";

export function toYearly(amount: number, freq: Frequency): number {
  if (freq === "weekly") return amount * 52;
  if (freq === "fortnightly") return amount * 26;
  return amount * 12;
}

export function fromYearly(yearlyAmount: number, base: Frequency): number {
  if (base === "weekly") return yearlyAmount / 52;
  if (base === "fortnightly") return yearlyAmount / 26;
  return yearlyAmount / 12;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
