type Kind = "pass" | "fail" | "warn" | "neutral";

const STYLES: Record<Kind, string> = {
  pass: "border-pass/40 bg-pass-wash text-pass",
  fail: "border-fail/40 bg-fail-wash text-fail",
  warn: "border-warn/40 bg-warn-wash text-warn",
  neutral: "border-hairline-strong bg-panel-raised text-ink-dim",
};

export default function StatusBadge({ kind, children }: { kind: Kind; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${STYLES[kind]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
