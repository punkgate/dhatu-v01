"""Executable regression check for the DHATU baseline process model.

Run from ``dhatu/backend`` with ``.venv\\Scripts\\python test_simulation_validation.py``.
"""

from main import simulate_process
from schemas import SimulationRequest


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


def main() -> None:
    result = simulate_process(SimulationRequest.model_validate(SAMPLE_INPUT)).results
    beneficiation = result["beneficiation"]
    reduction = result["thermal_reduction"]
    milling = result["milling"]
    overall = result["overall"]

    assert abs(beneficiation["concentrate_mass_kg"] + beneficiation["tailings_mass_kg"] - 1000) <= 0.01
    assert abs(milling["final_product_mass_kg"] + milling["off_spec_mass_kg"] - reduction["mno_product_mass_kg"]) <= 0.01
    assert overall["total_energy_kwh"] == 620
    assert overall["total_water_l"] == 850
    assert beneficiation["concentrate_mno2_percent"] >= 65
    assert beneficiation["concentrate_mass_kg"] == 940
    assert beneficiation["tailings_mass_kg"] == 60
    assert result["quality"]["passes_specification"]
    print("Simulation validation passed.")


if __name__ == "__main__":
    main()
