import type { ProcessResults, ProcessPrediction } from "../types/api";
import { fmt } from "../lib/format";

interface Props {
  simulation: ProcessResults;
  prediction: ProcessPrediction;
}

// Only compares metrics that exist in both the engineering simulation
// ("overall"/"thermal_reduction") and the ML process_prediction targets.
export default function ModelVsSimComparison({ simulation, prediction }: Props) {
  const rows = [
    {
      label: "Mn Recovery",
      sim: simulation.thermal_reduction.mn_recovery_percent,
      ml: prediction.mn_recovery_percent,
      unit: "%",
    },
    {
      label: "Product Mass",
      sim: simulation.milling.final_product_mass_kg,
      ml: prediction.final_product_mass_kg,
      unit: "kg",
    },
    {
      label: "Energy",
      sim: simulation.overall.total_energy_kwh,
      ml: prediction.total_energy_kwh,
      unit: "kWh",
    },
    {
      label: "CO₂",
      sim: simulation.overall.estimated_co2_kg,
      ml: prediction.estimated_co2_kg,
      unit: "kg",
    },
  ];

  return (
    <div className="border border-hairline bg-panel">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-hairline text-[10px] uppercase tracking-wider text-ink-faint">
            <th className="px-4 py-2.5 font-medium">Metric</th>
            <th className="px-4 py-2.5 font-medium">Simulation</th>
            <th className="px-4 py-2.5 font-medium">ML Prediction</th>
            <th className="px-4 py-2.5 font-medium">Δ</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((row) => {
            const delta = row.ml - row.sim;
            return (
              <tr key={row.label} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2.5 font-sans text-ink-dim">{row.label}</td>
                <td className="px-4 py-2.5 text-ink">
                  {fmt(row.sim, 1)} {row.unit}
                </td>
                <td className="px-4 py-2.5 text-ink">
                  {fmt(row.ml, 1)} {row.unit}
                </td>
                <td className="px-4 py-2.5 text-ink-faint">
                  {delta >= 0 ? "+" : ""}
                  {fmt(delta, 1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
