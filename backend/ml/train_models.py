"""Train DHATU ML surrogates on engineering-constrained synthetic data only."""

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split

from ml.evaluate_models import classifier_metrics, regression_metrics
from ml.features import ANOMALY_FEATURE_COLUMNS, FEATURE_COLUMNS, validate_feature_columns

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "manganese_synthetic_3000.csv"
MODELS_PATH = ROOT / "models"
RANDOM_SEED = 42
PROCESS_TARGETS = ["mn_recovery_percent", "final_product_mass_kg", "total_energy_kwh", "estimated_co2_kg", "estimated_cost_inr"]
QUALITY_TARGETS = ["final_mn_percent", "final_mno_percent", "final_fe_percent", "final_sio2_percent", "final_al2o3_percent", "residual_mno2_percent", "moisture_percent", "pb_ppm", "as_ppm", "cd_ppm", "hg_ppm", "density_kg_dm3", "mesh_passing_percent"]


def train_all_models() -> dict[str, object]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Synthetic dataset not found: {DATA_PATH}")
    dataframe = pd.read_csv(DATA_PATH)
    validate_feature_columns(dataframe)
    required_targets = PROCESS_TARGETS + QUALITY_TARGETS + ["passes_specification", "run_type"]
    missing = set(required_targets) - set(dataframe.columns)
    if missing:
        raise ValueError(f"Dataset missing ML target columns: {sorted(missing)}")
    features = dataframe[FEATURE_COLUMNS]
    train_index, test_index = train_test_split(dataframe.index, test_size=0.20, random_state=RANDOM_SEED, stratify=dataframe["passes_specification"])
    x_train, x_test = features.loc[train_index], features.loc[test_index]
    regressor_kwargs = {"n_estimators": 120, "random_state": RANDOM_SEED, "n_jobs": -1, "min_samples_leaf": 2}
    process_model = RandomForestRegressor(**regressor_kwargs).fit(x_train, dataframe.loc[train_index, PROCESS_TARGETS])
    quality_model = RandomForestRegressor(**regressor_kwargs).fit(x_train, dataframe.loc[train_index, QUALITY_TARGETS])
    classifier = RandomForestClassifier(**regressor_kwargs, class_weight="balanced").fit(x_train, dataframe.loc[train_index, "passes_specification"])
    process_metrics = regression_metrics(dataframe.loc[test_index, PROCESS_TARGETS].to_numpy(), process_model.predict(x_test), PROCESS_TARGETS)
    quality_metrics = regression_metrics(dataframe.loc[test_index, QUALITY_TARGETS].to_numpy(), quality_model.predict(x_test), QUALITY_TARGETS)
    probabilities = classifier.predict_proba(x_test)[:, list(classifier.classes_).index(True)]
    classifier_metrics_result = classifier_metrics(dataframe.loc[test_index, "passes_specification"].astype(int).to_numpy(), classifier.predict(x_test).astype(int), probabilities)

    normal = dataframe[dataframe["run_type"] == "normal"]
    anomaly_detector = IsolationForest(n_estimators=200, contamination=0.10, random_state=RANDOM_SEED).fit(normal[ANOMALY_FEATURE_COLUMNS])
    normal_detection_rate = float((anomaly_detector.predict(normal[ANOMALY_FEATURE_COLUMNS]) == 1).mean())
    deliberately_unusual = dataframe[dataframe["run_type"].isin(["energy_inefficient", "poor_feed", "quality_failure", "high_emission", "process_anomaly"])]
    anomaly_detection_rate = float((anomaly_detector.predict(deliberately_unusual[ANOMALY_FEATURE_COLUMNS]) == -1).mean())
    MODELS_PATH.mkdir(parents=True, exist_ok=True)
    joblib.dump(process_model, MODELS_PATH / "process_model.joblib")
    joblib.dump(quality_model, MODELS_PATH / "quality_regression_model.joblib")
    joblib.dump(classifier, MODELS_PATH / "quality_classifier.joblib")
    joblib.dump(anomaly_detector, MODELS_PATH / "anomaly_detector.joblib")
    metadata = {"dataset_name": DATA_PATH.name, "dataset_rows": len(dataframe), "data_type": "engineering-constrained synthetic data", "random_seed": RANDOM_SEED, "feature_columns": FEATURE_COLUMNS, "feature_count": len(FEATURE_COLUMNS), "training_timestamp": datetime.now(timezone.utc).isoformat(), "process_prediction_targets": PROCESS_TARGETS, "quality_prediction_targets": QUALITY_TARGETS, "process_model_metrics": process_metrics, "quality_regression_metrics": quality_metrics, "quality_classifier_metrics": classifier_metrics_result, "anomaly_detection_summary": {"training_population": "normal runs only", "normal_detection_rate": normal_detection_rate, "known_unusual_detection_rate": anomaly_detection_rate, "features": ANOMALY_FEATURE_COLUMNS}}
    (MODELS_PATH / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("DHATU ML TRAINING\n")
    print(f"Dataset loaded: {len(dataframe)} rows\n")
    print("Training process outcome predictor...")
    print(f"Mn Recovery R2: {process_metrics['mn_recovery_percent']['r2']:.3f}")
    print(f"Energy MAE: {process_metrics['total_energy_kwh']['mae']:.2f}")
    print(f"CO2 MAE: {process_metrics['estimated_co2_kg']['mae']:.2f}\n")
    print("Training quality regression model...")
    print("Training specification classifier...")
    print(f"F1 Score: {classifier_metrics_result['f1']:.3f}")
    print(f"ROC-AUC: {classifier_metrics_result['roc_auc']:.3f}\n")
    print("Training anomaly detector...")
    print(f"Normal detection rate: {normal_detection_rate:.3f}")
    print(f"Anomaly detection rate: {anomaly_detection_rate:.3f}\n")
    print("Models saved successfully.")
    return metadata


if __name__ == "__main__":
    train_all_models()
