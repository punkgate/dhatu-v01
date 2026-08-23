"""Centralized provisional assumptions for synthetic DHATU data generation.

These ranges and coefficients create engineering-constrained synthetic data;
they are not experimentally validated RMPL plant parameters.
"""

RANDOM_SEED = 42
DATASET_SIZE = 3_000
RUN_TYPE_COUNTS = {
    "normal": 1_500,
    "high_recovery": 300,
    "energy_inefficient": 300,
    "poor_feed": 250,
    "quality_failure": 250,
    "high_emission": 200,
    "process_anomaly": 200,
}

TARGET_MESH_OPTIONS = (100, 150, 200, 250, 300)

NORMAL_FEED_RANGES = {
    "feed_mass_kg": (800.0, 1200.0), "feed_mno2_percent": (60.0, 75.0),
    "feed_fe_percent": (2.0, 6.0), "feed_sio2_percent": (2.0, 6.0),
    "feed_al2o3_percent": (1.0, 4.0), "feed_moisture_percent": (0.2, 1.5),
    "feed_pb_ppm": (10.0, 100.0), "feed_as_ppm": (5.0, 60.0),
    "feed_cd_ppm": (0.5, 10.0), "feed_hg_ppm": (0.01, 0.5),
}
POOR_FEED_RANGES = {
    "feed_mass_kg": (800.0, 1200.0), "feed_mno2_percent": (40.0, 60.0),
    "feed_fe_percent": (6.0, 12.0), "feed_sio2_percent": (6.0, 15.0),
    "feed_al2o3_percent": (4.0, 8.0), "feed_moisture_percent": (1.0, 5.0),
    "feed_pb_ppm": (50.0, 250.0), "feed_as_ppm": (40.0, 150.0),
    "feed_cd_ppm": (5.0, 40.0), "feed_hg_ppm": (0.2, 2.0),
}
FEED_MN_FACTOR = 0.632
FEED_MN_NOISE_PERCENT = (-2.0, 2.0)

RUN_TYPE_RANGES = {
    "normal": {"feed": "normal", "recovery": (80.0, 95.0), "benef_energy": (50.0, 150.0), "water": (500.0, 2000.0), "temperature": (810.0, 890.0), "residence": (60.0, 150.0), "reductant_ratio": (0.14, 0.22), "inefficiency": (0.95, 1.10), "mesh": (150, 300)},
    "high_recovery": {"feed": "normal", "recovery": (90.0, 97.0), "benef_energy": (80.0, 170.0), "water": (800.0, 2500.0), "temperature": (900.0, 905.0), "residence": (120.0, 130.0), "reductant_ratio": (0.19, 0.21), "inefficiency": (1.00, 1.15), "mesh": (150, 250)},
    "energy_inefficient": {"feed": "normal", "recovery": (75.0, 90.0), "benef_energy": (150.0, 300.0), "water": (1500.0, 4000.0), "temperature": (950.0, 1100.0), "residence": (180.0, 300.0), "reductant_ratio": (0.12, 0.30), "inefficiency": (1.35, 1.75), "mesh": (200, 300)},
    "poor_feed": {"feed": "poor", "recovery": (60.0, 82.0), "benef_energy": (100.0, 220.0), "water": (1200.0, 3500.0), "temperature": (800.0, 980.0), "residence": (90.0, 220.0), "reductant_ratio": (0.12, 0.30), "inefficiency": (1.05, 1.35), "mesh": (150, 300)},
    "quality_failure": {"feed": "poor", "recovery": (50.0, 80.0), "benef_energy": (50.0, 180.0), "water": (500.0, 2200.0), "temperature": (750.0, 840.0), "residence": (30.0, 100.0), "reductant_ratio": (0.05, 0.14), "inefficiency": (1.00, 1.35), "mesh": (100, 150)},
    "high_emission": {"feed": "normal", "recovery": (75.0, 92.0), "benef_energy": (150.0, 300.0), "water": (1500.0, 4000.0), "temperature": (900.0, 1050.0), "residence": (140.0, 260.0), "reductant_ratio": (0.22, 0.35), "inefficiency": (1.35, 1.80), "mesh": (200, 300)},
    "process_anomaly": {"feed": "normal", "recovery": (50.0, 80.0), "benef_energy": (150.0, 300.0), "water": (800.0, 3500.0), "temperature": (750.0, 1100.0), "residence": (30.0, 300.0), "reductant_ratio": (0.05, 0.40), "inefficiency": (1.10, 1.80), "mesh": (100, 300)},
}

# Provisional energy relationships, using absolute batch units.
THERMAL_ENERGY_COEFFICIENTS = {"base_kwh": 300.0, "temperature_kwh_per_c": 0.90, "residence_kwh_per_min": 0.65, "moisture_kwh_per_percent": 14.0}
MILLING_ENERGY_COEFFICIENTS = {"base_kwh_per_kg": 0.045, "mesh_kwh_per_kg_per_mesh": 0.00025, "efficiency_reference_percent": 96.0}

BENEFICIATION_REMOVAL_RANGES = {"fe": (0.15, 0.45), "sio2": (0.25, 0.60), "al2o3": (0.15, 0.45)}
HEAVY_METAL_RETENTION_RANGES = {"pb": (0.70, 0.95), "as": (0.70, 0.95), "cd": (0.70, 0.95), "hg": (0.30, 0.80)}
QUALITY_NOISE = {"impurity_percent": (-0.25, 0.25), "density_kg_dm3": (-0.015, 0.015), "mesh_passing_percent": (-1.5, 1.0)}
