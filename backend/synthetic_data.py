"""Generate engineering-constrained synthetic manganese processing data.

The output is synthetic, reproducible MVP data generated from provisional
process relationships, mass balances, specifications, and controlled noise.
It is not real RMPL plant data and must not be treated as experimentally valid.
"""

from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pandas as pd

from process_model import run_process
from quality_model import check_specification
from synthetic_parameters import (
    BENEFICIATION_REMOVAL_RANGES, DATASET_SIZE, FEED_MN_FACTOR,
    FEED_MN_NOISE_PERCENT, HEAVY_METAL_RETENTION_RANGES,
    MILLING_ENERGY_COEFFICIENTS, NORMAL_FEED_RANGES, POOR_FEED_RANGES,
    QUALITY_NOISE, RANDOM_SEED, RUN_TYPE_COUNTS, RUN_TYPE_RANGES,
    TARGET_MESH_OPTIONS, THERMAL_ENERGY_COEFFICIENTS,
)

DATASET_PATH = Path(__file__).parent / "data" / "manganese_synthetic_3000.csv"


def _uniform(rng: np.random.Generator, bounds: tuple[float, float]) -> float:
    return float(rng.uniform(*bounds))


def _bounded(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _feed_properties(rng: np.random.Generator, feed_kind: str) -> dict[str, float]:
    ranges = NORMAL_FEED_RANGES if feed_kind == "normal" else POOR_FEED_RANGES
    feed = {name: _uniform(rng, bounds) for name, bounds in ranges.items()}
    feed["feed_mn_percent"] = _bounded(
        feed["feed_mno2_percent"] * FEED_MN_FACTOR + _uniform(rng, FEED_MN_NOISE_PERCENT),
        0.0,
        100.0,
    )
    return feed


def _thermal_energy_kwh(temperature_c: float, residence_time_min: float, moisture_percent: float, inefficiency: float) -> float:
    coefficients = THERMAL_ENERGY_COEFFICIENTS
    return (
        coefficients["base_kwh"]
        + max(temperature_c - 750.0, 0.0) * coefficients["temperature_kwh_per_c"]
        + residence_time_min * coefficients["residence_kwh_per_min"]
        + moisture_percent * coefficients["moisture_kwh_per_percent"]
    ) * inefficiency


def _milling_energy_kwh(feed_mass_kg: float, recovery_percent: float, target_mesh: int, inefficiency: float) -> float:
    coefficients = MILLING_ENERGY_COEFFICIENTS
    estimated_milling_mass = feed_mass_kg * recovery_percent / 100.0 * 0.80
    specific_energy = coefficients["base_kwh_per_kg"] + target_mesh * coefficients["mesh_kwh_per_kg_per_mesh"]
    return estimated_milling_mass * specific_energy * inefficiency * 1.90


def _synthetic_quality(rng: np.random.Generator, feed: dict[str, float], results: dict[str, dict[str, object]], target_mesh: int) -> dict[str, object]:
    """Augment shared quality results with impurity propagation and material data."""
    recovery = float(results["beneficiation"]["recovery_percent"])
    base_quality = results["quality"]
    quality = {key: value for key, value in base_quality.items() if key not in {"passes_specification", "failed_parameters", "checks"}}
    recovery_factor = recovery / 100.0
    for source, output, removal_name in (
        ("feed_fe_percent", "iron_percent", "fe"),
        ("feed_sio2_percent", "silica_percent", "sio2"),
        ("feed_al2o3_percent", "alumina_percent", "al2o3"),
    ):
        removal = _uniform(rng, BENEFICIATION_REMOVAL_RANGES[removal_name]) * (0.7 + 0.3 * recovery_factor)
        quality[output] = _bounded(feed[source] * (1.0 - removal) + _uniform(rng, QUALITY_NOISE["impurity_percent"]), 0.0, 100.0)
    for source, output, retention_name in (
        ("feed_pb_ppm", "pb_ppm", "pb"), ("feed_as_ppm", "as_ppm", "as"),
        ("feed_cd_ppm", "cd_ppm", "cd"), ("feed_hg_ppm", "hg_ppm", "hg"),
    ):
        quality[output] = max(0.0, feed[source] * _uniform(rng, HEAVY_METAL_RETENTION_RANGES[retention_name]))
    conversion = float(results["thermal_reduction"]["conversion_efficiency_percent"])
    quality["density_kg_dm3"] = _bounded(1.80 + conversion * 0.00075 + _uniform(rng, QUALITY_NOISE["density_kg_dm3"]), 1.72, 1.94)
    milling_efficiency = float(results["milling"]["milling_efficiency_percent"])
    quality["mesh_passing_percent"] = _bounded(milling_efficiency + _uniform(rng, QUALITY_NOISE["mesh_passing_percent"]), 70.0, 100.0)
    quality["final_particle_mesh"] = float(target_mesh)
    quality.update(check_specification(quality))
    return quality


def _generate_run(rng: np.random.Generator, batch_id: int, run_type: str) -> dict[str, object]:
    config = RUN_TYPE_RANGES[run_type]
    feed = _feed_properties(rng, config["feed"])
    recovery_control = _uniform(rng, config["recovery"])
    beneficiation_energy = _uniform(rng, config["benef_energy"])
    beneficiation_water = _uniform(rng, config["water"])
    temperature = _uniform(rng, config["temperature"])
    residence = _uniform(rng, config["residence"])
    inefficiency = _uniform(rng, config["inefficiency"])
    target_mesh = int(rng.choice([mesh for mesh in TARGET_MESH_OPTIONS if config["mesh"][0] <= mesh <= config["mesh"][1]]))
    provisional_concentrate_mass = feed["feed_mass_kg"] * recovery_control / 100.0
    reductant_ratio = _uniform(rng, config["reductant_ratio"])
    reductant_kg = reductant_ratio * provisional_concentrate_mass
    thermal_energy = _thermal_energy_kwh(temperature, residence, feed["feed_moisture_percent"], inefficiency)
    milling_energy = _milling_energy_kwh(feed["feed_mass_kg"], recovery_control, target_mesh, inefficiency)
    data = SimpleNamespace(
        feed_mass_kg=feed["feed_mass_kg"], feed_mno2_percent=feed["feed_mno2_percent"],
        beneficiation=SimpleNamespace(water_l=beneficiation_water, energy_kwh=beneficiation_energy),
        thermal_reduction=SimpleNamespace(temperature_c=temperature, residence_time_min=residence, reductant_kg=reductant_kg, energy_kwh=thermal_energy, kiln_speed_rpm=None),
        milling=SimpleNamespace(target_mesh=target_mesh, energy_kwh=milling_energy),
    )
    results = run_process(
        data,
        beneficiation_recovery_control_percent=recovery_control,
        reductant_ratio_control=reductant_ratio,
    )
    quality = _synthetic_quality(rng, feed, results, target_mesh)
    beneficiation = results["beneficiation"]
    reduction = results["thermal_reduction"]
    milling = results["milling"]
    overall = results["overall"]
    return {
        "batch_id": f"SYN-{batch_id:04d}", "run_type": run_type,
        **feed,
        "beneficiation_recovery_control_percent": recovery_control,
        "beneficiation_energy_kwh": beneficiation_energy, "beneficiation_water_l": beneficiation_water,
        "temperature_c": temperature, "residence_time_min": residence,
        "reductant_ratio": reductant_ratio, "reductant_kg": reductant_kg,
        "thermal_energy_kwh": thermal_energy, "target_mesh": target_mesh, "milling_energy_kwh": milling_energy,
        "beneficiation_recovery_percent": beneficiation["recovery_percent"],
        "concentrate_mass_kg": beneficiation["concentrate_mass_kg"], "tailings_mass_kg": beneficiation["tailings_mass_kg"],
        "concentrate_mno2_percent": beneficiation["concentrate_mno2_percent"],
        "conversion_efficiency_percent": reduction["conversion_efficiency_percent"], "mno_product_mass_kg": reduction["mno_product_mass_kg"], "mn_recovery_percent": reduction["mn_recovery_percent"],
        "milling_efficiency_percent": milling["milling_efficiency_percent"], "final_product_mass_kg": milling["final_product_mass_kg"], "off_spec_mass_kg": milling["off_spec_mass_kg"],
        "final_mn_percent": quality["mn_content_percent"], "final_mno_percent": quality["mno_percent"],
        "final_fe_percent": quality["iron_percent"], "final_sio2_percent": quality["silica_percent"], "final_al2o3_percent": quality["alumina_percent"],
        "residual_mno2_percent": quality["residual_mno2_percent"], "moisture_percent": quality["moisture_percent"],
        "pb_ppm": quality["pb_ppm"], "as_ppm": quality["as_ppm"], "cd_ppm": quality["cd_ppm"], "hg_ppm": quality["hg_ppm"],
        "density_kg_dm3": quality["density_kg_dm3"], "final_particle_mesh": quality["final_particle_mesh"], "mesh_passing_percent": quality["mesh_passing_percent"],
        "passes_specification": quality["passes_specification"],
        "total_energy_kwh": overall["total_energy_kwh"], "total_water_l": overall["total_water_l"], "total_waste_kg": overall["total_waste_kg"],
        "estimated_co2_kg": overall["estimated_co2_kg"], "estimated_cost_inr": overall["estimated_cost"],
    }


def generate_dataset() -> pd.DataFrame:
    """Generate the fixed, reproducible 3,000-run engineering-constrained dataset."""
    rng = np.random.default_rng(RANDOM_SEED)
    rows = []
    batch_id = 1
    for run_type, count in RUN_TYPE_COUNTS.items():
        for _ in range(count):
            rows.append(_generate_run(rng, batch_id, run_type))
            batch_id += 1
    dataframe = pd.DataFrame(rows)
    assert len(dataframe) == DATASET_SIZE
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataframe.to_csv(DATASET_PATH, index=False)
    return dataframe


def _print_summary(dataframe: pd.DataFrame) -> None:
    print("DHATU SYNTHETIC DATASET GENERATED\n")
    print(f"Total Runs: {len(dataframe)}\n")
    for name, count in RUN_TYPE_COUNTS.items():
        print(f"{name.replace('_', ' ').title()}: {count}")
    print(f"\nSpecification Pass: {int(dataframe['passes_specification'].sum())}")
    print(f"Specification Fail: {int((~dataframe['passes_specification']).sum())}\n")
    print(f"Average Mn Recovery: {dataframe['mn_recovery_percent'].mean():.2f}%")
    print(f"Average Energy: {dataframe['total_energy_kwh'].mean():.2f} kWh")
    print(f"Average CO2: {dataframe['estimated_co2_kg'].mean():.2f} kg")
    print(f"Average Product Mass: {dataframe['final_product_mass_kg'].mean():.2f} kg")


if __name__ == "__main__":
    _print_summary(generate_dataset())
