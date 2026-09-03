export function fmt(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${fmt(value, digits)}%`;
}

export function fmtSigned(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${fmt(value, digits)}`;
}

export function fmtCurrency(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `₹${fmt(value, digits)}`;
}

export const MODE_LABELS: Record<string, string> = {
  maximum_recovery: "Max Recovery",
  minimum_impact: "Min Impact",
  balanced: "Balanced",
};
