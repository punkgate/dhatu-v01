import { useState } from "react";
import { useAnalysis } from "../context/useAnalysis";
import Section from "../components/Section";
import NumberField from "../components/NumberField";
import LoadingSteps from "../components/LoadingSteps";
import MetricCard from "../components/MetricCard";
import QualityTable from "../components/QualityTable";
import AnomalyPanel from "../components/AnomalyPanel";
import OptimizationComparison from "../components/OptimizationComparison";
import ModelVsSimComparison from "../components/ModelVsSimComparison";
import ProcessStages from "../components/ProcessStages";

type ResultTab = "overview" | "process" | "quality" | "optimization";

const TABS: { key: ResultTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "process", label: "Process" },
  { key: "quality", label: "Quality" },
  { key: "optimization", label: "Optimization" },
];

export default function Analysis() {
  const { input, setInput, runAnalysis, isRunning, hasRun, simulation, prediction, anomaly, optimizationResults, steps } =
    useAnalysis();
  const [tab, setTab] = useState<ResultTab>("overview");

  const update = <K extends keyof typeof input>(key: K, value: (typeof input)[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const updateNested = <
    S extends "beneficiation" | "thermal_reduction" | "milling",
    K extends keyof (typeof input)[S]
  >(
    section: S,
    key: K,
    value: (typeof input)[S][K]
  ) => setInput((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const results = simulation?.results;
  const anyStepFailed = Object.values(steps).some((s) => s.status === "error");

  return (
    <div className="page-content mx-auto max-w-5xl px-10 py-14">
      <header className="mb-8">
        <div className="mb-3 text-xs font-medium text-accent-bright">Simulation workspace</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-ink">Run analysis</h1>
        <p className="mt-2 text-sm text-ink-faint">
          Feed, beneficiation, thermal reduction, and milling parameters for one batch.
        </p>
      </header>

      <div className="space-y-3">
        <Section title="Feed Composition" mark="01">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-4">
            <NumberField
              label="Feed Mass"
              unit="kg"
              value={input.feed_mass_kg}
              min={0.01}
              max={1_000_000}
              onChange={(v) => update("feed_mass_kg", v ?? 0)}
            />
            <NumberField
              label="MnO₂"
              unit="%"
              value={input.feed_mno2_percent}
              min={0.01}
              max={90}
              step={0.5}
              onChange={(v) => update("feed_mno2_percent", v ?? 0)}
            />
            <NumberField
              label="Mn"
              unit="%"
              value={input.feed_mn_percent}
              min={0}
              max={100}
              step={0.5}
              optional
              onChange={(v) => update("feed_mn_percent", v)}
            />
            <NumberField
              label="Fe"
              unit="%"
              value={input.feed_fe_percent}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => update("feed_fe_percent", v ?? 0)}
            />
            <NumberField
              label="SiO₂"
              unit="%"
              value={input.feed_sio2_percent}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => update("feed_sio2_percent", v ?? 0)}
            />
            <NumberField
              label="Al₂O₃"
              unit="%"
              value={input.feed_al2o3_percent}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => update("feed_al2o3_percent", v ?? 0)}
            />
            <NumberField
              label="Moisture"
              unit="%"
              value={input.feed_moisture_percent}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => update("feed_moisture_percent", v ?? 0)}
            />
            <NumberField
              label="Pb"
              unit="ppm"
              value={input.feed_pb_ppm}
              min={0}
              onChange={(v) => update("feed_pb_ppm", v ?? 0)}
            />
            <NumberField
              label="As"
              unit="ppm"
              value={input.feed_as_ppm}
              min={0}
              onChange={(v) => update("feed_as_ppm", v ?? 0)}
            />
            <NumberField
              label="Cd"
              unit="ppm"
              value={input.feed_cd_ppm}
              min={0}
              onChange={(v) => update("feed_cd_ppm", v ?? 0)}
            />
            <NumberField
              label="Hg"
              unit="ppm"
              value={input.feed_hg_ppm}
              min={0}
              step={0.1}
              onChange={(v) => update("feed_hg_ppm", v ?? 0)}
            />
          </div>
        </Section>

        <Section title="Beneficiation" mark="02">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-4">
            <NumberField
              label="Water"
              unit="L"
              value={input.beneficiation.water_l}
              min={0}
              max={10_000}
              onChange={(v) => updateNested("beneficiation", "water_l", v ?? 0)}
            />
            <NumberField
              label="Energy"
              unit="kWh"
              value={input.beneficiation.energy_kwh}
              min={0}
              max={10_000}
              onChange={(v) => updateNested("beneficiation", "energy_kwh", v ?? 0)}
            />
          </div>
        </Section>

        <Section title="Thermal Reduction" mark="03">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-4">
            <NumberField
              label="Temperature"
              unit="°C"
              value={input.thermal_reduction.temperature_c}
              min={500}
              max={1_200}
              onChange={(v) => updateNested("thermal_reduction", "temperature_c", v ?? 500)}
            />
            <NumberField
              label="Residence Time"
              unit="min"
              value={input.thermal_reduction.residence_time_min}
              min={10}
              max={600}
              onChange={(v) => updateNested("thermal_reduction", "residence_time_min", v ?? 10)}
            />
            <NumberField
              label="Reductant"
              unit="kg"
              value={input.thermal_reduction.reductant_kg}
              min={0}
              max={5_000}
              onChange={(v) => updateNested("thermal_reduction", "reductant_kg", v ?? 0)}
            />
            <NumberField
              label="Energy"
              unit="kWh"
              value={input.thermal_reduction.energy_kwh}
              min={0}
              max={20_000}
              onChange={(v) => updateNested("thermal_reduction", "energy_kwh", v ?? 0)}
            />
            <NumberField
              label="Kiln Speed"
              unit="rpm"
              value={input.thermal_reduction.kiln_speed_rpm}
              min={0.1}
              max={20}
              step={0.1}
              optional
              onChange={(v) => updateNested("thermal_reduction", "kiln_speed_rpm", v)}
            />
          </div>
        </Section>

        <Section title="Milling" mark="04">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-4">
            <NumberField
              label="Target Mesh"
              value={input.milling.target_mesh}
              min={40}
              max={500}
              onChange={(v) => updateNested("milling", "target_mesh", v ?? 40)}
            />
            <NumberField
              label="Energy"
              unit="kWh"
              value={input.milling.energy_kwh}
              min={0}
              max={10_000}
              onChange={(v) => updateNested("milling", "energy_kwh", v ?? 0)}
            />
            <NumberField
              label="Initial Particle Size"
              unit="mm"
              value={input.milling.initial_particle_size_mm}
              min={0.01}
              max={100}
              step={0.1}
              optional
              onChange={(v) => updateNested("milling", "initial_particle_size_mm", v)}
            />
          </div>
        </Section>
      </div>

      <div className="mt-6">
        <button
          onClick={() => void runAnalysis()}
          disabled={isRunning}
          className="w-full border border-accent bg-accent-wash py-3 font-mono text-[13px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-accent-dim/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running…" : "Run DHATU Analysis"}
        </button>
      </div>

      {(isRunning || hasRun) && (
        <div className="mt-6">
          <LoadingSteps steps={steps} />
        </div>
      )}

      {hasRun && !isRunning && results && (
        <div className="mt-8">
          <div className="mb-4 flex gap-1 border-b border-hairline">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                  className={`px-5 py-3 text-[14px] font-medium transition-colors ${
                  tab === t.key
                    ? "border-b-2 border-accent text-ink"
                    : "border-b-2 border-transparent text-ink-faint hover:text-ink-dim"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricCard
                  label="Mn Recovery"
                  value={results.thermal_reduction.mn_recovery_percent.toFixed(1)}
                  unit="%"
                />
                <MetricCard
                  label="Product Status"
                  value={results.quality.passes_specification ? "PASS" : "FAIL"}
                  status={results.quality.passes_specification ? "pass" : "fail"}
                />
                <MetricCard label="Energy" value={results.overall.total_energy_kwh.toFixed(0)} unit="kWh" />
                <MetricCard label="CO₂" value={results.overall.estimated_co2_kg.toFixed(0)} unit="kg" />
                <MetricCard label="Cost" value={`₹${results.overall.estimated_cost.toFixed(0)}`} />
                <MetricCard
                  label="Anomaly"
                  value={anomaly ? (anomaly.classification === "anomaly" ? "ANOMALY" : "NORMAL") : "—"}
                  status={anomaly ? (anomaly.classification === "anomaly" ? "fail" : "pass") : "neutral"}
                />
              </div>

              {prediction && (
                <div>
                  <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                    Engineering Model vs. ML Prediction
                  </h3>
                  <ModelVsSimComparison simulation={results} prediction={prediction.process_prediction} />
                </div>
              )}

              {prediction && (
                <div className="border border-hairline bg-panel px-4 py-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                    Predicted Specification Probability
                  </div>
                  <div className="mt-1 font-mono text-xl text-ink">
                    {(prediction.specification_prediction.probability * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "process" && <ProcessStages results={results} />}

          {tab === "quality" && (
            <div className="space-y-5">
              <QualityTable quality={results.quality} />
              {anomaly && <AnomalyPanel anomaly={anomaly} />}
            </div>
          )}

          {tab === "optimization" && (
            <OptimizationComparison current={results} results={optimizationResults} />
          )}
        </div>
      )}

      {hasRun && !isRunning && !results && anyStepFailed && (
        <div className="mt-6 border border-fail/40 bg-fail-wash px-4 py-3 text-[13px] text-fail">
          Simulation failed — {steps.simulate.error}
        </div>
      )}
    </div>
  );
}
