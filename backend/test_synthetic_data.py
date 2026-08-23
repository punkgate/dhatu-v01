"""Validate the DHATU engineering-constrained synthetic dataset."""

from pathlib import Path

import numpy as np
import pandas as pd

from synthetic_data import DATASET_PATH
from synthetic_parameters import DATASET_SIZE, RUN_TYPE_COUNTS


REQUIRED_COLUMNS = {
    "batch_id", "run_type", "feed_mass_kg", "feed_mno2_percent", "feed_mn_percent",
    "feed_fe_percent", "feed_sio2_percent", "feed_al2o3_percent", "feed_moisture_percent",
    "feed_pb_ppm", "feed_as_ppm", "feed_cd_ppm", "feed_hg_ppm",
    "beneficiation_recovery_control_percent", "beneficiation_energy_kwh", "beneficiation_water_l",
    "temperature_c", "residence_time_min", "reductant_ratio", "reductant_kg", "thermal_energy_kwh",
    "target_mesh", "milling_energy_kwh", "beneficiation_recovery_percent", "concentrate_mass_kg",
    "tailings_mass_kg", "concentrate_mno2_percent", "conversion_efficiency_percent", "mno_product_mass_kg",
    "mn_recovery_percent", "milling_efficiency_percent", "final_product_mass_kg", "off_spec_mass_kg",
    "final_mn_percent", "final_mno_percent", "final_fe_percent", "final_sio2_percent", "final_al2o3_percent",
    "residual_mno2_percent", "moisture_percent", "pb_ppm", "as_ppm", "cd_ppm", "hg_ppm",
    "density_kg_dm3", "final_particle_mesh", "mesh_passing_percent", "passes_specification",
    "total_energy_kwh", "total_water_l", "total_waste_kg", "estimated_co2_kg", "estimated_cost_inr",
}


def main() -> None:
    assert Path(DATASET_PATH).exists(), f"Dataset not found: {DATASET_PATH}"
    dataframe = pd.read_csv(DATASET_PATH)
    assert len(dataframe) == DATASET_SIZE
    assert REQUIRED_COLUMNS.issubset(dataframe.columns)
    assert not dataframe.isna().any().any()
    numeric = dataframe.select_dtypes(include=[np.number])
    assert np.isfinite(numeric.to_numpy()).all()
    assert (numeric >= 0).all().all()
    for column in dataframe.columns:
        if "percent" in column:
            assert dataframe[column].between(0, 100).all(), f"Out-of-range percentage: {column}"
    assert dataframe["run_type"].value_counts().to_dict() == RUN_TYPE_COUNTS
    assert dataframe["passes_specification"].any()
    assert (~dataframe["passes_specification"]).any()
    assert np.allclose(dataframe["concentrate_mass_kg"] + dataframe["tailings_mass_kg"], dataframe["feed_mass_kg"], atol=1e-6)
    assert np.allclose(dataframe["final_product_mass_kg"] + dataframe["off_spec_mass_kg"], dataframe["mno_product_mass_kg"], atol=1e-6)

    means = dataframe.groupby("run_type").mean(numeric_only=True)
    assert means.loc["high_emission", "estimated_co2_kg"] > means.loc["normal", "estimated_co2_kg"]
    assert means.loc["energy_inefficient", "total_energy_kwh"] > means.loc["normal", "total_energy_kwh"]
    assert means.loc["high_recovery", "mn_recovery_percent"] > means.loc["normal", "mn_recovery_percent"]
    assert means.loc["poor_feed", "feed_mno2_percent"] < means.loc["normal", "feed_mno2_percent"]
    assert abs(means.loc["process_anomaly", "mn_recovery_percent"] - means.loc["normal", "mn_recovery_percent"]) > 5.0
    print("Synthetic dataset validation passed.")


if __name__ == "__main__":
    main()
