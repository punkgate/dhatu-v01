interface Props {
  label: string;
  value: string;
  unit?: string;
  status?: "pass" | "fail" | "warn" | "neutral";
  sub?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pass: "text-pass",
  fail: "text-fail",
  warn: "text-warn",
  neutral: "text-ink",
};

export default function MetricCard({ label, value, unit, status = "neutral", sub }: Props) {
  return (
    <div className="border border-hairline bg-panel px-5 py-5">
      <div className="text-[13px] font-medium text-ink-faint">{label}</div>
      <div className={`mt-2 text-[30px] font-semibold leading-none ${STATUS_COLOR[status]}`}>
        {value}
        {unit && <span className="ml-1 text-sm text-ink-faint">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-ink-dim">{sub}</div>}
    </div>
  );
}
