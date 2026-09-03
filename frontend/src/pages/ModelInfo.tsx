import { useEffect, useState } from "react";
import { ApiError, getModelMetrics } from "../services/api";
import type { ModelMetricsResponse } from "../types/api";
import { fmt, fmtPercent } from "../lib/format";

export default function ModelInfo() {
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getModelMetrics()
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load model metrics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-content mx-auto max-w-5xl px-10 py-14">
      <header className="mb-8">
        <div className="mb-3 text-xs font-medium text-accent-bright">Model performance</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-ink">DHATU ML intelligence</h1>
        <p className="mt-2 text-sm text-ink-faint">Model architecture, training data, and evaluation metrics.</p>
      </header>

      <div className="mb-6 border border-warn/40 bg-warn-wash px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-ink">
          Models are trained on engineering-constrained synthetic process data. They are designed as
          predictive and analytical prototypes and are not yet validated against industrial plant
          operation data.
        </p>
      </div>

      {loading && <div className="text-[13px] text-ink-faint">Loading model metrics…</div>}
      {error && (
        <div className="border border-fail/40 bg-fail-wash px-4 py-3 text-[13px] text-fail">{error}</div>
      )}

      {metrics && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Dataset Rows" value={fmt(metrics.dataset_rows, 0)} />
            <Stat label="Features" value={fmt(metrics.feature_count, 0)} />
            <Stat label="Random Seed" value={fmt(metrics.random_seed, 0)} />
            <Stat label="Training Data" value={metrics.data_type} small />
          </div>

          <div className="border border-hairline bg-panel px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Dataset</div>
            <div className="mt-1 font-mono text-[13px] text-ink">{metrics.dataset_name}</div>
            <div className="mt-1 text-[11.5px] text-ink-faint">
              Trained {new Date(metrics.training_timestamp).toLocaleString()}
            </div>
          </div>

          <MetricsTable title="Process Model (Regression)" data={metrics.process_model_metrics} />
          <MetricsTable title="Quality Model (Regression)" data={metrics.quality_regression_metrics} />

          <div className="border border-hairline bg-panel">
            <div className="border-b border-hairline px-4 py-2.5 text-[11.5px] font-medium text-ink">
              Specification Classifier
            </div>
            <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-5">
              {[
                ["Precision", metrics.quality_classifier_metrics.precision],
                ["Recall", metrics.quality_classifier_metrics.recall],
                ["F1", metrics.quality_classifier_metrics.f1],
                ["ROC-AUC", metrics.quality_classifier_metrics.roc_auc],
                ["Accuracy", metrics.quality_classifier_metrics.accuracy],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-panel px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
                  <div className="mt-1 font-mono text-base text-ink">{fmt(value as number, 3)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-hairline bg-panel">
            <div className="border-b border-hairline px-4 py-2.5 text-[11.5px] font-medium text-ink">
              Anomaly Detector
            </div>
            <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-3">
              <div className="bg-panel px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-faint">Training Population</div>
                <div className="mt-1 font-mono text-base text-ink">
                  {fmt(metrics.anomaly_detection_summary.training_population, 0)}
                </div>
              </div>
              <div className="bg-panel px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-faint">Normal Detection Rate</div>
                <div className="mt-1 font-mono text-base text-ink">
                  {fmtPercent(metrics.anomaly_detection_summary.normal_detection_rate * 100)}
                </div>
              </div>
              <div className="bg-panel px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-faint">Known-Unusual Detection Rate</div>
                <div className="mt-1 font-mono text-base text-ink">
                  {fmtPercent(metrics.anomaly_detection_summary.known_unusual_detection_rate * 100)}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-hairline bg-panel px-4 py-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">
              Input Features ({metrics.feature_count})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {metrics.feature_columns.map((col) => (
                <span
                  key={col}
                  className="border border-hairline-strong bg-panel-raised px-2 py-0.5 font-mono text-[10.5px] text-ink-dim"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="border border-hairline bg-panel px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">{label}</div>
      <div className={`mt-1 font-mono text-ink ${small ? "text-[12px] leading-snug" : "text-xl"}`}>{value}</div>
    </div>
  );
}

function MetricsTable({ title, data }: { title: string; data: Record<string, { mae: number; rmse: number; r2: number }> }) {
  return (
    <div className="border border-hairline bg-panel">
      <div className="border-b border-hairline px-4 py-2.5 text-[11.5px] font-medium text-ink">{title}</div>
      <table className="w-full border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-hairline text-[10px] uppercase tracking-wider text-ink-faint">
            <th className="px-4 py-2 font-medium">Target</th>
            <th className="px-4 py-2 font-medium">MAE</th>
            <th className="px-4 py-2 font-medium">RMSE</th>
            <th className="px-4 py-2 font-medium">R²</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {Object.entries(data).map(([target, m]) => (
            <tr key={target} className="border-b border-hairline last:border-0">
              <td className="px-4 py-2 font-sans text-ink-dim">{target}</td>
              <td className="px-4 py-2 text-ink">{fmt(m.mae, 3)}</td>
              <td className="px-4 py-2 text-ink">{fmt(m.rmse, 3)}</td>
              <td className="px-4 py-2 text-ink">{fmt(m.r2, 3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
