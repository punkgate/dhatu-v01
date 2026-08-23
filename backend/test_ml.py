"""Executable structural checks for the DHATU ML intelligence layer."""

from math import isfinite

from main import anomaly_check, model_metrics, predict
from schemas import SimulationRequest


SAMPLE_INPUT = {
    "feed_mass_kg": 1000,
    "feed_mno2_percent": 65,
    "feed_fe_percent": 4,
    "feed_sio2_percent": 4,
    "feed_al2o3_percent": 2,
    "feed_moisture_percent": 1,
    "feed_pb_ppm": 50,
    "feed_as_ppm": 25,
    "feed_cd_ppm": 5,
    "feed_hg_ppm": 0.2,
    "beneficiation": {"water_l": 850, "energy_kwh": 120},
    "thermal_reduction": {"temperature_c": 850, "residence_time_min": 120, "reductant_kg": 100, "energy_kwh": 420},
    "milling": {"target_mesh": 200, "energy_kwh": 80},
}


def _assert_finite(value: object) -> None:
    if isinstance(value, dict):
        for nested_value in value.values():
            _assert_finite(nested_value)
    elif isinstance(value, (float, int)):
        assert isfinite(value)


def main() -> None:
    request = SimulationRequest.model_validate(SAMPLE_INPUT)
    prediction = predict(request)
    anomaly = anomaly_check(request)
    metrics = model_metrics()
    assert prediction["status"] == "success"
    assert prediction["process_prediction"]
    assert prediction["quality_prediction"]
    assert 0 <= prediction["specification_prediction"]["probability"] <= 1
    assert anomaly["classification"] in {"normal", "anomaly"}
    assert isinstance(anomaly["is_anomaly"], bool)
    _assert_finite(prediction)
    _assert_finite(anomaly)
    assert metrics["data_type"] == "engineering-constrained synthetic data"
    assert metrics["dataset_rows"] == 3000
    print("ML API and metadata validation passed.")


if __name__ == "__main__":
    main()