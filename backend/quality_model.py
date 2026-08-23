"""Provisional engineering quality relationships for DHATU's MnO MVP.

This module is a transparent process-model baseline, not a trained or
scientifically validated ML quality predictor. Real RMPL batch data should
calibrate or replace these relationships in a future release.
"""

from specifications import (
    AL2O3_MAX,
    AS_MAX_PPM,
    CD_MAX_PPM,
    DENSITY_MAX_KG_DM3,
    DENSITY_MIN_KG_DM3,
    FE_MAX,
    HG_MAX_PPM,
    MN_MIN,
    MNO_MIN,
    MOISTURE_MAX,
    MESH_PASSING_MIN_PERCENT,
    PB_MAX_PPM,
    RESIDUAL_MNO2_MAX,
    SIO2_MAX,
    TARGET_MESH_MIN,
)


def _bounded(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def predict_product_quality(
    *,
    feed_mno2_percent: float,
    conversion_efficiency_percent: float,
    temperature_c: float,
    residence_time_min: float,
    reductant_kg: float,
    target_mesh: int,
) -> dict[str, float]:
    """Estimate provisional MnO product quality from process conditions."""
    operating_deviation = (
        abs(temperature_c - 850.0) / 150.0
        + abs(residence_time_min - 120.0) / 120.0
        + abs(reductant_kg - 100.0) / 100.0
    )
    mn_content = _bounded(50.0 + 0.20 * feed_mno2_percent + 0.12 * conversion_efficiency_percent - 0.8 * operating_deviation, 45.0, 78.0)
    mno_percent = _bounded(49.0 + 0.10 * feed_mno2_percent + 0.31 * conversion_efficiency_percent - 1.2 * operating_deviation, 55.0, 96.0)
    iron_percent = _bounded(11.0 - 0.060 * feed_mno2_percent - 0.008 * conversion_efficiency_percent + 0.20 * operating_deviation, 2.0, 12.0)
    silica_percent = _bounded(11.0 - 0.055 * feed_mno2_percent - 0.005 * (target_mesh - 100) + 0.10 * operating_deviation, 1.0, 12.0)
    alumina_percent = _bounded(7.0 - 0.030 * feed_mno2_percent - 0.003 * (target_mesh - 100) + 0.08 * operating_deviation, 0.5, 8.0)
    residual_mno2_percent = _bounded((100.0 - conversion_efficiency_percent) * 0.12 + 0.25 * operating_deviation, 0.0, 12.0)
    moisture_percent = _bounded(1.45 - 0.0035 * target_mesh + 0.02 * residual_mno2_percent, 0.1, 3.0)
    return {
        "mn_content_percent": mn_content,
        "mno_percent": mno_percent,
        "iron_percent": iron_percent,
        "silica_percent": silica_percent,
        "alumina_percent": alumina_percent,
        "residual_mno2_percent": residual_mno2_percent,
        "moisture_percent": moisture_percent,
        "final_particle_mesh": float(target_mesh),
    }


def check_specification(quality_results: dict[str, float]) -> dict[str, object]:
    """Check a provisional quality result against the centralized MnO limits."""
    checks = {
        "mn_content": quality_results["mn_content_percent"] >= MN_MIN,
        "mno_content": quality_results["mno_percent"] >= MNO_MIN,
        "iron": quality_results["iron_percent"] <= FE_MAX,
        "silica": quality_results["silica_percent"] <= SIO2_MAX,
        "alumina": quality_results["alumina_percent"] <= AL2O3_MAX,
        "residual_mno2": quality_results["residual_mno2_percent"] <= RESIDUAL_MNO2_MAX,
        "moisture": quality_results["moisture_percent"] <= MOISTURE_MAX,
        "particle_size": quality_results["final_particle_mesh"] >= TARGET_MESH_MIN,
    }
    optional_checks = {
        "lead": quality_results.get("pb_ppm", 0.0) <= PB_MAX_PPM,
        "arsenic": quality_results.get("as_ppm", 0.0) <= AS_MAX_PPM,
        "cadmium": quality_results.get("cd_ppm", 0.0) <= CD_MAX_PPM,
        "mercury": quality_results.get("hg_ppm", 0.0) <= HG_MAX_PPM,
        "density": DENSITY_MIN_KG_DM3 <= quality_results.get("density_kg_dm3", 1.85) <= DENSITY_MAX_KG_DM3,
        "mesh_passing": quality_results.get("mesh_passing_percent", 100.0) >= MESH_PASSING_MIN_PERCENT,
    }
    checks.update(optional_checks)
    failed_parameter_names = {
        "mn_content": "mn_content_percent",
        "mno_content": "mno_percent",
        "iron": "iron_percent",
        "silica": "silica_percent",
        "alumina": "alumina_percent",
        "residual_mno2": "residual_mno2_percent",
        "moisture": "moisture_percent",
        "particle_size": "final_particle_mesh",
        "lead": "pb_ppm",
        "arsenic": "as_ppm",
        "cadmium": "cd_ppm",
        "mercury": "hg_ppm",
        "density": "density_kg_dm3",
        "mesh_passing": "mesh_passing_percent",
    }
    failed_parameters = [failed_parameter_names[name] for name, passes in checks.items() if not passes]
    return {
        "passes_specification": not failed_parameters,
        "failed_parameters": failed_parameters,
        "checks": checks,
    }
