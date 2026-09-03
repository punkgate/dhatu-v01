import type { OptimizationMode, OptimizationResponse } from "../types/api";

/**
 * Picks a recommended optimization mode from whatever optimization results
 * actually came back from the API. Never hardcodes a winner — only modes
 * with status "success" and a passing product spec are eligible, and the
 * score is computed from the live optimized_results for each mode.
 *
 * Weights mirror the backend's own balanced-mode weighting (see
 * backend/optimizer.py BALANCED_WEIGHTS) so the frontend recommendation
 * reasons about the same trade-offs the optimizer does, without needing
 * the backend to expose a dedicated "recommended mode" field.
 */
const WEIGHTS = {
  recovery: 0.35,
  productMass: 0.25,
  energy: 0.1,
  co2: 0.12,
  cost: 0.08,
};

export function recommendMode(
  results: Partial<Record<OptimizationMode, OptimizationResponse>>
): OptimizationMode | null {
  const eligible = (Object.entries(results) as [OptimizationMode, OptimizationResponse][]).filter(
    ([, r]) => r.status === "success" && r.optimized_results?.quality.passes_specification
  );
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0][0];

  const recoveries = eligible.map(([, r]) => r.optimized_results!.thermal_reduction.mn_recovery_percent);
  const masses = eligible.map(([, r]) => r.optimized_results!.milling.final_product_mass_kg);
  const energies = eligible.map(([, r]) => r.optimized_results!.overall.total_energy_kwh);
  const co2s = eligible.map(([, r]) => r.optimized_results!.overall.estimated_co2_kg);
  const costs = eligible.map(([, r]) => r.optimized_results!.overall.estimated_cost);

  const norm = (value: number, arr: number[], invert = false) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    if (max === min) return 0.5;
    const n = (value - min) / (max - min);
    return invert ? 1 - n : n;
  };

  let best: OptimizationMode | null = null;
  let bestScore = -Infinity;
  eligible.forEach(([mode, r], i) => {
    const results_ = r.optimized_results!;
    const score =
      WEIGHTS.recovery * norm(recoveries[i], recoveries) +
      WEIGHTS.productMass * norm(masses[i], masses) +
      WEIGHTS.energy * norm(energies[i], energies, true) +
      WEIGHTS.co2 * norm(co2s[i], co2s, true) +
      WEIGHTS.cost * norm(costs[i], costs, true);
    void results_;
    if (score > bestScore) {
      bestScore = score;
      best = mode;
    }
  });
  return best;
}
