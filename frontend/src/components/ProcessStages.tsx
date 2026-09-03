import type { ProcessResults } from "../types/api";
import { fmt, fmtPercent } from "../lib/format";

export default function ProcessStages({ results }: { results: ProcessResults }) {
  const stages = [
    {
      title: "Beneficiation",
      rows: [
        { label: "Concentrate Mass", value: `${fmt(results.beneficiation.concentrate_mass_kg, 0)} kg` },
        { label: "Tailings Mass", value: `${fmt(results.beneficiation.tailings_mass_kg, 0)} kg` },
        { label: "Recovery", value: fmtPercent(results.beneficiation.recovery_percent) },
        { label: "Concentrate MnO₂", value: fmtPercent(results.beneficiation.concentrate_mno2_percent) },
      ],
    },
    {
      title: "Thermal Reduction",
      rows: [
        { label: "MnO Product Mass", value: `${fmt(results.thermal_reduction.mno_product_mass_kg, 0)} kg` },
        {
          label: "Conversion Efficiency",
          value: fmtPercent(results.thermal_reduction.conversion_efficiency_percent),
        },
        { label: "Mn Recovery", value: fmtPercent(results.thermal_reduction.mn_recovery_percent) },
      ],
    },
    {
      title: "Milling",
      rows: [
        { label: "Final Product Mass", value: `${fmt(results.milling.final_product_mass_kg, 0)} kg` },
        { label: "Off-Spec Mass", value: `${fmt(results.milling.off_spec_mass_kg, 0)} kg` },
        { label: "Milling Efficiency", value: fmtPercent(results.milling.milling_efficiency_percent) },
        { label: "Particle Mesh", value: `${fmt(results.milling.final_particle_mesh, 0)}` },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {stages.map((stage) => (
        <div key={stage.title} className="border border-hairline bg-panel">
          <div className="border-b border-hairline px-5 py-3 text-sm font-semibold text-ink">
            {stage.title}
          </div>
          <dl className="divide-y divide-hairline">
            {stage.rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-[11.5px] text-ink-dim">{row.label}</dt>
                <dd className="text-[12.5px] font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
