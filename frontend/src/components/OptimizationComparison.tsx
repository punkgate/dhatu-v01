import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { OptimizationMode, OptimizationResponse, ProcessResults } from "../types/api";
import { fmt, fmtCurrency, fmtPercent, MODE_LABELS } from "../lib/format";
import StatusBadge from "./StatusBadge";
import { recommendMode } from "../lib/recommend";

interface Props {
  current: ProcessResults;
  results: Partial<Record<OptimizationMode, OptimizationResponse>>;
}

const MODES: OptimizationMode[] = ["maximum_recovery", "minimum_impact", "balanced"];

export default function OptimizationComparison({ current, results }: Props) {
  const recommended = recommendMode(results);

  const columns: { key: string; label: string; data: ProcessResults | null; failed?: string | null }[] = [
    { key: "current", label: "Current", data: current },
    ...MODES.map((mode) => {
      const r = results[mode];
      return {
        key: mode,
        label: MODE_LABELS[mode],
        data: r?.status === "success" ? r.optimized_results ?? null : null,
        failed: r?.status === "no_feasible_solution" ? r.message : null,
      };
    }),
  ];

  const chartData = ["maximum_recovery", "minimum_impact", "balanced"].map((mode) => {
    const r = results[mode as OptimizationMode];
    const data = r?.status === "success" ? r.optimized_results : null;
    return {
      mode: MODE_LABELS[mode],
      Recovery: data ? Math.round(data.thermal_reduction.mn_recovery_percent * 10) / 10 : 0,
      "Energy (kWh)": data ? Math.round(data.overall.total_energy_kwh) : 0,
      "CO2 (kg)": data ? Math.round(data.overall.estimated_co2_kg) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-medium text-accent-bright">Process optimization</div>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-ink">Compare feasible operating strategies</h2>
        <p className="mt-2 text-[15px] text-ink-faint">Select the process conditions to change, then review the expected production outcome.</p>
      </div>
      <div className="overflow-x-auto border border-hairline bg-panel">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-hairline text-[10px] uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-2.5 font-medium">Metric</th>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.key === recommended && (
                      <span className="border border-accent/50 bg-accent-wash px-1 py-0.5 font-mono text-[9px] text-accent-bright">
                        REC
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            <Row label="Mn Recovery" columns={columns} pick={(d) => fmtPercent(d.thermal_reduction.mn_recovery_percent)} />
            <Row label="Product Mass" columns={columns} pick={(d) => `${fmt(d.milling.final_product_mass_kg, 0)} kg`} />
            <Row label="Energy" columns={columns} pick={(d) => `${fmt(d.overall.total_energy_kwh, 0)} kWh`} />
            <Row label="CO₂" columns={columns} pick={(d) => `${fmt(d.overall.estimated_co2_kg, 0)} kg`} />
            <Row label="Cost" columns={columns} pick={(d) => fmtCurrency(d.overall.estimated_cost)} />
            <tr>
              <td className="px-4 py-2.5 text-ink-dim">Product Quality</td>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2.5">
                  {col.data ? (
                    <StatusBadge kind={col.data.quality.passes_specification ? "pass" : "fail"}>
                      {col.data.quality.passes_specification ? "Pass" : "Fail"}
                    </StatusBadge>
                  ) : col.failed ? (
                    <span className="text-[11px] text-ink-faint">No feasible solution</span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="glass-panel p-5 sm:p-7">
        <div className="mb-5">
          <h3 className="font-heading text-xl font-semibold text-ink">Recommended operating configuration</h3>
          <p className="mt-1 text-[15px] text-ink-dim">Review the operating conditions selected for each objective.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
        {MODES.map((mode) => {
          const result = results[mode];
          const configuration = result?.recommended_configuration ?? result?.optimized_parameters;
          const expected = result?.expected_results ?? result?.optimized_results;
          const quality = result?.quality ?? expected?.quality;
          const unavailable = result?.status === "no_feasible_solution";

          return (
            <section key={mode} className={`border p-4 ${mode === recommended ? "border-accent/60 bg-accent-wash" : "border-hairline bg-panel"}`}>
              <header className="mb-4 border-b border-hairline pb-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">{MODE_LABELS[mode]}</div>
                <h3 className="mt-1 font-heading text-lg font-semibold text-ink">Optimization strategy</h3>
                <p className="mt-1 text-[13px] text-ink-faint">{OBJECTIVES[mode]}</p>
              </header>

              {unavailable ? (
                <p className="text-[12px] text-ink-faint">No feasible solution for this strategy.</p>
              ) : (
                <>
                  <div>
                    <div className="mb-2 text-[11px] font-medium text-accent-bright">
                      Recommended configuration
                    </div>
                    <div className="space-y-2">
                      <ConfigRow label="Reduction Temperature" value={configuration ? `${fmt(configuration.temperature_c, 0)} °C` : "—"} />
                      <ConfigRow label="Residence Time" value={configuration ? `${fmt(configuration.residence_time_min, 0)} min` : "—"} />
                      <ConfigRow label="Reductant" value={configuration ? `${fmt(configuration.reductant_kg, 1)} kg` : "—"} />
                      <ConfigRow label="Target Mesh" value={configuration ? fmt(configuration.target_mesh, 0) : "—"} />
                    </div>
                  </div>

                  <div className="mt-5 border-t border-hairline pt-4">
                    <div className="mb-2 text-[11px] font-medium text-ink-faint">
                      Expected outcome
                    </div>
                    <div className="space-y-2">
                      <ConfigRow label="Mn Recovery" value={expected ? fmtPercent(expected.thermal_reduction.mn_recovery_percent) : "—"} />
                      <ConfigRow label="Product Mass" value={expected ? `${fmt(expected.milling.final_product_mass_kg, 0)} kg` : "—"} />
                      <ConfigRow label="Energy" value={expected ? `${fmt(expected.overall.total_energy_kwh, 0)} kWh` : "—"} />
                      <ConfigRow label="CO₂" value={expected ? `${fmt(expected.overall.estimated_co2_kg, 0)} kg` : "—"} />
                      <ConfigRow label="Cost" value={expected ? fmtCurrency(expected.overall.estimated_cost) : "—"} />
                      <ConfigRow
                        label="Quality"
                        value={quality ? (quality.passes_specification ? "PASS" : "FAIL") : "—"}
                        valueClass={quality?.passes_specification ? "text-pass" : "text-warn"}
                      />
                    </div>
                  </div>
                </>
              )}
            </section>
          );
        })}
        </div>
      </div>

      {recommended && (
        <div className="border border-accent/40 bg-accent-wash px-4 py-3">
          <div className="text-[11px] font-medium text-accent-bright">
            Recommended configuration
          </div>
          <p className="mt-1 text-[12.5px] text-ink-dim">
            <span className="text-ink">{MODE_LABELS[recommended]}</span> gives the best balance of
            recovery, resource impact, and cost among the modes that meet product specification.
          </p>
        </div>
      )}

      <div className="border border-hairline bg-panel p-4">
        <div className="mb-3 text-[11px] font-medium text-ink-faint">
          Recovery and resource use
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
            <XAxis dataKey="mode" tick={{ fill: "var(--color-ink-faint)", fontSize: 11 }} axisLine={{ stroke: "var(--color-hairline-strong)" }} tickLine={false} />
            <YAxis tick={{ fill: "var(--color-ink-faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--color-panel-raised)",
                border: "1px solid var(--color-hairline-strong)",
                fontSize: 12,
                color: "var(--color-ink)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-ink-dim)" }} />
            <Bar dataKey="Recovery" fill="var(--color-accent)" />
            <Bar dataKey="Energy (kWh)" fill="var(--color-ink-faint)" />
            <Bar dataKey="CO2 (kg)" fill="var(--color-warn)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const OBJECTIVES: Record<OptimizationMode, string> = {
  maximum_recovery: "Maximize feasible Mn recovery.",
  minimum_impact: "Reduce energy, emissions, and waste.",
  balanced: "Trade off recovery and resource impact.",
};

function ConfigRow({ label, value, valueClass = "text-ink" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[14px]">
      <span className="text-ink-dim">{label}</span>
      <span className={`text-right font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

function Row({
  label,
  columns,
  pick,
}: {
  label: string;
  columns: { key: string; data: ProcessResults | null }[];
  pick: (data: ProcessResults) => string;
}) {
  return (
    <tr className="border-b border-hairline">
      <td className="px-4 py-2.5 font-sans text-ink-dim">{label}</td>
      {columns.map((col) => (
        <td key={col.key} className="px-4 py-2.5 text-ink">
          {col.data ? pick(col.data) : <span className="text-ink-faint">—</span>}
        </td>
      ))}
    </tr>
  );
}
