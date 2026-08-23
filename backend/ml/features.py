"""Central feature definitions; inputs only, with no downstream target leakage."""

from typing import Any

import pandas as pd

FEATURE_COLUMNS = [
    "feed_mass_kg", "feed_mno2_percent", "feed_mn_percent", "feed_fe_percent",
    "feed_sio2_percent", "feed_al2o3_percent", "feed_moisture_percent", "feed_pb_ppm",
    "feed_as_ppm", "feed_cd_ppm", "feed_hg_ppm", "beneficiation_recovery_control_percent",
    "beneficiation_energy_kwh", "beneficiation_water_l", "temperature_c", "residence_time_min",
    "reductant_ratio", "thermal_energy_kwh", "target_mesh", "milling_energy_kwh",
]

ANOMALY_FEATURE_COLUMNS = [
    "feed_mno2_percent", "feed_fe_percent", "feed_sio2_percent", "feed_moisture_percent",
    "temperature_c", "residence_time_min", "reductant_ratio", "target_mesh",
]


def validate_feature_columns(dataframe: pd.DataFrame, columns: list[str] = FEATURE_COLUMNS) -> None:
    missing = set(columns) - set(dataframe.columns)
    if missing:
        raise ValueError(f"Dataset missing required ML feature columns: {sorted(missing)}")


def api_features(request: Any, process_results: dict[str, dict[str, float]] | None = None) -> pd.DataFrame:
    """Build the central feature frame from the compatible ML API request."""
    recovery = getattr(request, "beneficiation_recovery_control_percent", None)
    if recovery is None and process_results is not None:
        recovery = process_results["beneficiation"]["recovery_percent"]
    recovery = 85.0 if recovery is None else recovery
    reductant_ratio = getattr(request, "reductant_ratio", None)
    if reductant_ratio is None:
        reductant_ratio = request.thermal_reduction.reductant_kg / max(request.feed_mass_kg * recovery / 100.0, 1.0)
    row = {
        "feed_mass_kg": request.feed_mass_kg,
        "feed_mno2_percent": request.feed_mno2_percent,
        "feed_mn_percent": request.feed_mn_percent if request.feed_mn_percent is not None else request.feed_mno2_percent * 0.632,
        "feed_fe_percent": getattr(request, "feed_fe_percent", 0.0),
        "feed_sio2_percent": getattr(request, "feed_sio2_percent", 0.0),
        "feed_al2o3_percent": getattr(request, "feed_al2o3_percent", 0.0),
        "feed_moisture_percent": getattr(request, "feed_moisture_percent", 0.0),
        "feed_pb_ppm": getattr(request, "feed_pb_ppm", 0.0),
        "feed_as_ppm": getattr(request, "feed_as_ppm", 0.0),
        "feed_cd_ppm": getattr(request, "feed_cd_ppm", 0.0),
        "feed_hg_ppm": getattr(request, "feed_hg_ppm", 0.0),
        "beneficiation_recovery_control_percent": recovery,
        "beneficiation_energy_kwh": request.beneficiation.energy_kwh,
        "beneficiation_water_l": request.beneficiation.water_l,
        "temperature_c": request.thermal_reduction.temperature_c,
        "residence_time_min": request.thermal_reduction.residence_time_min,
        "reductant_ratio": reductant_ratio,
        "thermal_energy_kwh": request.thermal_reduction.energy_kwh,
        "target_mesh": request.milling.target_mesh,
        "milling_energy_kwh": request.milling.energy_kwh,
    }
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)
