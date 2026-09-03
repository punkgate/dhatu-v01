import type { StepKey, StepState } from "../context/AnalysisContext";

const LABELS: Record<StepKey, string> = {
  simulate: "Running process simulation",
  predict: "Generating ML prediction",
  anomaly: "Checking process anomalies",
  optimize: "Evaluating optimization strategies",
};

const ORDER: StepKey[] = ["simulate", "predict", "anomaly", "optimize"];

function Mark({ status }: { status: StepState["status"] }) {
  if (status === "done") return <span className="text-pass">✓</span>;
  if (status === "error") return <span className="text-fail">✕</span>;
  if (status === "running") return <span className="text-accent-bright">●</span>;
  return <span className="text-ink-faint">○</span>;
}

export default function LoadingSteps({ steps }: { steps: Record<StepKey, StepState> }) {
  return (
    <div className="border border-hairline bg-panel px-5 py-4">
      <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-ink-faint">
        Analyzing Manganese Process
      </div>
      <ul className="space-y-2 font-mono text-[13px]">
        {ORDER.map((key) => (
          <li key={key} className="step-in flex items-center gap-2.5">
            <Mark status={steps[key].status} />
            <span className={steps[key].status === "idle" ? "text-ink-faint" : "text-ink"}>
              {LABELS[key]}
            </span>
            {steps[key].status === "error" && (
              <span className="text-[11px] text-fail">— {steps[key].error}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
