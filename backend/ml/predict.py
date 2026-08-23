"""Artifact-backed ML inference for the DHATU API."""

from pathlib import Path

import joblib

from ml.features import ANOMALY_FEATURE_COLUMNS, api_features

MODELS_PATH = Path(__file__).resolve().parents[1] / "models"
PROCESS_MODEL = MODELS_PATH / "process_model.joblib"
QUALITY_MODEL = MODELS_PATH / "quality_regression_model.joblib"
CLASSIFIER_MODEL = MODELS_PATH / "quality_classifier.joblib"
ANOMALY_MODEL = MODELS_PATH / "anomaly_detector.joblib"

PROCESS_TARGETS = [
    "mn_recovery_percent", "final_product_mass_kg", "total_energy_kwh",
    "estimated_co2_kg", "estimated_cost_inr",
]
QUALITY_TARGETS = [
    "final_mn_percent", "final_mno_percent", "final_fe_percent", "final_sio2_percent",
    "final_al2o3_percent", "residual_mno2_percent", "moisture_percent", "pb_ppm",
    "as_ppm", "cd_ppm", "hg_ppm", "density_kg_dm3", "mesh_passing_percent",
]


def _load(path: Path):
    if not path.exists():
        raise FileNotFoundError(
            f"Trained model artifact is missing: {path.name}. Run `python -m ml.train_models` first."
        )
    return joblib.load(path)


def predict_process_and_quality(request, process_results):
    features = api_features(request, process_results)
    process_model = _load(PROCESS_MODEL)
    quality_model = _load(QUALITY_MODEL)
    classifier = _load(CLASSIFIER_MODEL)
    process_values = process_model.predict(features)[0]
    quality_values = quality_model.predict(features)[0]
    probabilities = classifier.predict_proba(features)[0]
    positive_index = list(classifier.classes_).index(True)
    probability = float(max(0.0, min(1.0, probabilities[positive_index])))
    return {
        "process_prediction": dict(zip(PROCESS_TARGETS, process_values)),
        "quality_prediction": dict(zip(QUALITY_TARGETS, quality_values)),
        "specification_prediction": {
            "passes_specification": bool(classifier.predict(features)[0]),
            "probability": probability,
        },
    }


def predict_anomaly(request, process_results):
    detector = _load(ANOMALY_MODEL)
    features = api_features(request, process_results)[ANOMALY_FEATURE_COLUMNS]
    prediction = int(detector.predict(features)[0])
    return {
        "is_anomaly": prediction == -1,
        "anomaly_score": float(detector.decision_function(features)[0]),
        "classification": "anomaly" if prediction == -1 else "normal",
    }