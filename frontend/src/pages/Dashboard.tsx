import { useAnalysis } from "../context/useAnalysis";
import ProcessFlow from "../components/ProcessFlow";
import MetricCard from "../components/MetricCard";
import type { Page } from "../App";

const STAGES = [
  { label: "Ore feed" },
  { label: "Beneficiation" },
  { label: "Thermal reduction" },
  { label: "Milling" },
  { label: "Quality" },
  { label: "Optimization" },
];

export default function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { simulation, anomaly, hasRun } = useAnalysis();
  const results = simulation?.results;

  return (
    <div className="page-content mx-auto max-w-5xl px-10 py-14">
      <header className="mb-10">
        <div className="mb-3 text-xs font-medium text-accent-bright">Process intelligence</div>
        <h1 className="font-heading text-5xl font-bold tracking-tight text-ink">DHATU</h1>
        <p className="mt-2 text-base text-ink-dim">Manganese process intelligence</p>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-ink-faint">
          Simulation, prediction and optimization for manganese processing.
        </p>
      </header>

      <ProcessFlow stages={STAGES} completeUpTo={hasRun ? STAGES.length - 1 : -1} />

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
          {hasRun ? "Most Recent Analysis" : "No Analysis Run"}
        </h2>
        <button
          onClick={() => onNavigate("analysis")}
          className="border border-accent/50 bg-accent-wash px-3 py-1.5 text-[12px] font-medium text-accent-bright transition-colors hover:bg-accent-dim/30"
        >
          {hasRun ? "Run New Analysis →" : "Run Analysis →"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Mn Recovery"
          value={results ? `${results.thermal_reduction.mn_recovery_percent.toFixed(1)}` : "No analysis run"}
          unit={results ? "%" : undefined}
        />
        <MetricCard
          label="Product Quality"
          value={results ? (results.quality.passes_specification ? "PASS" : "FAIL") : "No analysis run"}
          status={results ? (results.quality.passes_specification ? "pass" : "fail") : "neutral"}
        />
        <MetricCard
          label="Energy"
          value={results ? `${results.overall.total_energy_kwh.toFixed(0)}` : "No analysis run"}
          unit={results ? "kWh" : undefined}
        />
        <MetricCard
          label="CO₂"
          value={results ? `${results.overall.estimated_co2_kg.toFixed(0)}` : "No analysis run"}
          unit={results ? "kg" : undefined}
        />
        <MetricCard
          label="Estimated Cost"
          value={results ? `₹${results.overall.estimated_cost.toFixed(0)}` : "No analysis run"}
        />
        <MetricCard
          label="Anomaly Status"
          value={anomaly ? (anomaly.classification === "anomaly" ? "ANOMALY" : "NORMAL") : "No analysis run"}
          status={anomaly ? (anomaly.classification === "anomaly" ? "fail" : "pass") : "neutral"}
        />
      </div>
    </div>
  );
}
