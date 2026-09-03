import type { QualityResult } from "../types/api";
import { fmt, fmtPercent } from "../lib/format";
import StatusBadge from "./StatusBadge";

interface Row {
  checkKey: string;
  label: string;
  value: number;
  limitLabel: string;
  unit: string;
}

// Mirrors backend/specifications.py exactly. Only rows with a real value
// returned by the API are rendered — the backend's optional checks (lead,
// arsenic, cadmium, mercury, density, mesh passing) fall back to hardcoded
// defaults server-side when no measured value exists, so we omit them here
// rather than display a status for a number the API never actually sent.
function buildRows(q: QualityResult): Row[] {
  return [
    { checkKey: "mn_content", label: "Mn", value: q.mn_content_percent, limitLabel: "≥ 60%", unit: "%" },
    { checkKey: "mno_content", label: "MnO", value: q.mno_percent, limitLabel: "≥ 78%", unit: "%" },
    { checkKey: "iron", label: "Fe", value: q.iron_percent, limitLabel: "≤ 8%", unit: "%" },
    { checkKey: "silica", label: "SiO₂", value: q.silica_percent, limitLabel: "≤ 8%", unit: "%" },
    { checkKey: "alumina", label: "Al₂O₃", value: q.alumina_percent, limitLabel: "≤ 5%", unit: "%" },
    {
      checkKey: "residual_mno2",
      label: "Residual MnO₂",
      value: q.residual_mno2_percent,
      limitLabel: "≤ 2%",
      unit: "%",
    },
    { checkKey: "moisture", label: "Moisture", value: q.moisture_percent, limitLabel: "≤ 1%", unit: "%" },
    {
      checkKey: "particle_size",
      label: "Particle Mesh",
      value: q.final_particle_mesh,
      limitLabel: "≥ 100 mesh",
      unit: "mesh",
    },
  ];
}

export default function QualityTable({ quality }: { quality: QualityResult }) {
  const rows = buildRows(quality);
  return (
    <div className="border border-hairline bg-panel">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-hairline text-[11px] text-ink-faint">
            <th className="px-4 py-2.5 font-medium">Parameter</th>
            <th className="px-4 py-2.5 font-medium">Value</th>
            <th className="px-4 py-2.5 font-medium">Limit</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const passes = quality.checks[row.checkKey] ?? true;
            return (
              <tr key={row.checkKey} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2.5 text-ink">{row.label}</td>
                <td className="px-4 py-2.5 font-medium text-ink">
                  {row.unit === "%" ? fmtPercent(row.value) : `${fmt(row.value, 0)} ${row.unit}`}
                </td>
                <td className="px-4 py-2.5 text-ink-faint">{row.limitLabel}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge kind={passes ? "pass" : "fail"}>{passes ? "Pass" : "Fail"}</StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!quality.passes_specification && quality.failed_parameters.length > 0 && (
        <div className="border-t border-hairline bg-fail-wash px-4 py-2.5 text-[11.5px] text-fail">
          Failed parameters: {quality.failed_parameters.join(", ")}
        </div>
      )}
    </div>
  );
}
