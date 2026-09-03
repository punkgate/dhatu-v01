import type { AnomalyResponse } from "../types/api";
import { fmt } from "../lib/format";
import StatusBadge from "./StatusBadge";

export default function AnomalyPanel({ anomaly }: { anomaly: AnomalyResponse }) {
  const isAnomaly = anomaly.is_anomaly;
  return (
    <div className={`border ${isAnomaly ? "border-fail/40" : "border-hairline"} bg-panel px-5 py-4`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-ink-faint">
          Process Status
        </span>
        <StatusBadge kind={isAnomaly ? "fail" : "pass"}>
          {anomaly.classification === "anomaly" ? "Anomaly" : "Normal"}
        </StatusBadge>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[11px] text-ink-dim">Anomaly Score</span>
        <span className="text-sm font-medium text-ink">{fmt(anomaly.anomaly_score, 3)}</span>
      </div>
      {isAnomaly ? (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-dim">
          This configuration differs significantly from normal operating conditions in the trained
          model.
        </p>
      ) : (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-dim">
          Configuration is consistent with normal operating conditions in the trained model.
        </p>
      )}
      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-faint">
        Trained on engineering-constrained synthetic data — a directional signal, not a certified
        fault diagnosis.
      </p>
    </div>
  );
}
