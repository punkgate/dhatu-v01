"""Regression checks for the DHATU constrained process optimizer.

Run from ``dhatu/backend`` with ``.venv\\Scripts\\python test_optimizer.py``.
"""

from math import isfinite

from main import optimize
from optimizer import (
    REDUCTANT_KG_RANGE,
    RESIDENCE_TIME_MIN_RANGE,
    TARGET_MESH_RANGE,
    TEMPERATURE_C_RANGE,
)
from schemas import OptimizationRequest


SAMPLE_INPUT = {
    "feed_mass_kg": 1000,
    "feed_mno2_percent": 65,
    "beneficiation": {"water_l": 850, "energy_kwh": 120},
    "thermal_reduction": {
        "temperature_c": 850,
        "residence_time_min": 120,
        "reductant_kg": 100,
        "energy_kwh": 420,
    },
    "milling": {"target_mesh": 200, "energy_kwh": 80},
}


def _assert_finite(value: object) -> None:
    if isinstance(value, dict):
        for nested_value in value.values():
            _assert_finite(nested_value)
    elif isinstance(value, (float, int)):
        assert isfinite(value)


def _assert_parameter_bounds(parameters: dict[str, float]) -> None:
    assert TEMPERATURE_C_RANGE[0] <= parameters["temperature_c"] <= TEMPERATURE_C_RANGE[1]
    assert RESIDENCE_TIME_MIN_RANGE[0] <= parameters["residence_time_min"] <= RESIDENCE_TIME_MIN_RANGE[1]
    assert REDUCTANT_KG_RANGE[0] <= parameters["reductant_kg"] <= REDUCTANT_KG_RANGE[1]
    assert TARGET_MESH_RANGE[0] <= parameters["target_mesh"] <= TARGET_MESH_RANGE[1]


def main() -> None:
    for mode in ("maximum_recovery", "minimum_impact", "balanced"):
        response = optimize(OptimizationRequest.model_validate({**SAMPLE_INPUT, "mode": mode})).model_dump()
        optimized = response["optimized_results"]
        beneficiation = optimized["beneficiation"]
        reduction = optimized["thermal_reduction"]
        milling = optimized["milling"]

        assert response["status"] == "success"
        _assert_parameter_bounds(response["optimized_parameters"])
        assert abs(beneficiation["concentrate_mass_kg"] + beneficiation["tailings_mass_kg"] - 1000) <= 0.01
        assert abs(milling["final_product_mass_kg"] + milling["off_spec_mass_kg"] - reduction["mno_product_mass_kg"]) <= 0.01
        if mode == "minimum_impact":
            assert reduction["mn_recovery_percent"] >= 70
        _assert_finite(response)
        print(f"{mode}: passed")


if __name__ == "__main__":
    main()
