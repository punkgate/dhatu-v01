"""Regression checks for provisional DHATU quality and quality-aware optimization."""

from main import optimize
from quality_model import check_specification, predict_product_quality
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


def _quality(*, conversion: float, mesh: int) -> dict[str, float]:
    return predict_product_quality(
        feed_mno2_percent=65,
        conversion_efficiency_percent=conversion,
        temperature_c=850,
        residence_time_min=120,
        reductant_kg=100,
        target_mesh=mesh,
    )


def main() -> None:
    assert check_specification(_quality(conversion=96, mesh=200))["passes_specification"]

    low_conversion_check = check_specification(_quality(conversion=60, mesh=200))
    assert "residual_mno2_percent" in low_conversion_check["failed_parameters"]

    low_mno_check = check_specification(_quality(conversion=60, mesh=200))
    assert "mno_percent" in low_mno_check["failed_parameters"]

    mesh_check = check_specification(_quality(conversion=96, mesh=80))
    assert "final_particle_mesh" in mesh_check["failed_parameters"]

    for mode in ("maximum_recovery", "minimum_impact", "balanced"):
        response = optimize(OptimizationRequest.model_validate({**SAMPLE_INPUT, "mode": mode})).model_dump()
        assert response["status"] == "success"
        assert response["optimized_results"]["quality"]["passes_specification"]
    print("Quality and quality-aware optimizer validation passed.")


if __name__ == "__main__":
    main()
