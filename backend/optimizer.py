"""Constrained optimization over the shared DHATU process simulation baseline."""

from math import isfinite
from typing import Any

from scipy.optimize import differential_evolution

from process_model import run_process

TEMPERATURE_C_RANGE = (750.0, 1000.0)
RESIDENCE_TIME_MIN_RANGE = (60.0, 240.0)
REDUCTANT_KG_RANGE = (50.0, 200.0)
TARGET_MESH_RANGE = (100, 300)
OPTIMIZATION_BOUNDS = (
    TEMPERATURE_C_RANGE,
    RESIDENCE_TIME_MIN_RANGE,
    REDUCTANT_KG_RANGE,
    TARGET_MESH_RANGE,
)

MINIMUM_IMPACT_MIN_RECOVERY_PERCENT = 70.0
BALANCED_WEIGHTS = {
    "recovery": 0.35,
    "product_mass": 0.25,
    "energy": 0.10,
    "co2": 0.12,
    "waste": 0.10,
    "cost": 0.08,
}
OPTIMIZER_MAX_ITERATIONS = 35
OPTIMIZER_POPULATION_MULTIPLIER = 8
SPECIFICATION_FAILURE_PENALTY = 1e10


def _candidate_parameters(values: Any) -> dict[str, float]:
    """Convert an optimizer vector into API-unit candidate parameters."""
    return {
        "temperature_c": float(values[0]),
        "residence_time_min": float(values[1]),
        "reductant_kg": float(values[2]),
        "target_mesh": float(round(values[3])),
    }


def _evaluate(data: Any, values: Any) -> tuple[dict[str, float], dict[str, dict[str, Any]]]:
    parameters = _candidate_parameters(values)
    results = run_process(
        data,
        temperature_c=parameters["temperature_c"],
        residence_time_min=parameters["residence_time_min"],
        reductant_kg=parameters["reductant_kg"],
        target_mesh=int(parameters["target_mesh"]),
    )
    return parameters, results


def _candidate(data: Any, mode: str, values: Any, *, score: float | None = None) -> dict[str, Any]:
    parameters, results = _evaluate(data, values)
    candidate_score = _score(data, mode, values) if score is None else score
    feasible = results["quality"]["passes_specification"] and (
        mode != "minimum_impact"
        or results["thermal_reduction"]["mn_recovery_percent"] >= MINIMUM_IMPACT_MIN_RECOVERY_PERCENT
    )
    return {
        "configuration": parameters,
        "results": results,
        "quality": results["quality"],
        "score": candidate_score,
        "feasible": feasible,
    }


def _score(data: Any, mode: str, values: Any) -> float:
    """Score one candidate solely from a shared run_process evaluation."""
    _, results = _evaluate(data, values)
    reduction = results["thermal_reduction"]
    milling = results["milling"]
    overall = results["overall"]
    recovery = reduction["mn_recovery_percent"]
    product_mass = milling["final_product_mass_kg"]

    if not all(isfinite(value) for value in (recovery, product_mass, *overall.values())):
        return 1e12
    # A non-conforming product is never an acceptable recommendation.
    if not results["quality"]["passes_specification"]:
        return SPECIFICATION_FAILURE_PENALTY
    if mode == "maximum_recovery":
        return -(1_000.0 * recovery + product_mass)
    if mode == "minimum_impact":
        if recovery < MINIMUM_IMPACT_MIN_RECOVERY_PERCENT:
            return 1e9 + (MINIMUM_IMPACT_MIN_RECOVERY_PERCENT - recovery) * 1e6
        return overall["total_energy_kwh"] + overall["estimated_co2_kg"] + overall["total_waste_kg"]

    # Transparent, dimensionless multi-objective MVP score; higher is better.
    balanced_score = (
        BALANCED_WEIGHTS["recovery"] * recovery / 100.0
        + BALANCED_WEIGHTS["product_mass"] * product_mass / data.feed_mass_kg
        - BALANCED_WEIGHTS["energy"] * overall["total_energy_kwh"] / max(data.thermal_reduction.energy_kwh + data.beneficiation.energy_kwh + data.milling.energy_kwh, 1.0)
        - BALANCED_WEIGHTS["co2"] * overall["estimated_co2_kg"] / 1_000.0
        - BALANCED_WEIGHTS["waste"] * overall["total_waste_kg"] / data.feed_mass_kg
        - BALANCED_WEIGHTS["cost"] * overall["estimated_cost"] / 100.0
    )
    return -balanced_score


def optimize_process(data: Any, mode: str) -> dict[str, Any] | None:
    """Find a feasible configuration by repeatedly running the process engine."""
    solution = differential_evolution(
        lambda values: _score(data, mode, values),
        bounds=OPTIMIZATION_BOUNDS,
        seed=42,
        maxiter=OPTIMIZER_MAX_ITERATIONS,
        popsize=OPTIMIZER_POPULATION_MULTIPLIER,
        polish=True,
        workers=1,
        updating="immediate",
    )
    candidate = _candidate(data, mode, solution.x, score=float(solution.fun))
    if not candidate["feasible"]:
        return None
    return candidate
