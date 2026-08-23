"""FastAPI entry point for the DHATU process-model baseline."""

from fastapi import FastAPI

from emissions import calculate_impacts
from process_model import simulate_beneficiation, simulate_milling, simulate_thermal_reduction
from schemas import SimulationRequest, SimulationResponse

app = FastAPI(title="DHATU API", version="0.1.0", description="Manganese process simulation baseline.")


def _round_results(values: dict[str, float], digits: int = 2) -> dict[str, float]:
    """Round only API output; process stages always exchange full-precision values."""
    return {key: round(value, digits) for key, value in values.items()}


@app.get("/")
def health_check() -> dict[str, str]:
    return {"message": "DHATU API is running"}


@app.post("/simulate", response_model=SimulationResponse)
def simulate_process(request: SimulationRequest) -> SimulationResponse:
    """Simulate beneficiation, reduction, milling, and provisional impacts."""
    beneficiation = simulate_beneficiation(
        feed_mass_kg=request.feed_mass_kg,
        feed_mno2_percent=request.feed_mno2_percent,
        water_l=request.beneficiation.water_l,
        energy_kwh=request.beneficiation.energy_kwh,
    )
    reduction = simulate_thermal_reduction(
        concentrate_mass_kg=beneficiation["concentrate_mass_kg"],
        concentrate_mno2_percent=beneficiation["concentrate_mno2_percent"],
        **request.thermal_reduction.model_dump(),
    )
    milling = simulate_milling(
        mno_product_mass_kg=reduction["mno_product_mass_kg"],
        **request.milling.model_dump(exclude={"initial_particle_size_mm"}),
    )
    total_energy = request.beneficiation.energy_kwh + request.thermal_reduction.energy_kwh + request.milling.energy_kwh
    total_waste = beneficiation["tailings_mass_kg"] + milling["off_spec_mass_kg"]
    impacts = calculate_impacts(
        total_energy_kwh=total_energy,
        total_water_l=request.beneficiation.water_l,
        reductant_kg=request.thermal_reduction.reductant_kg,
        total_waste_kg=total_waste,
    )
    return SimulationResponse(results={
        "beneficiation": _round_results(beneficiation),
        "thermal_reduction": _round_results(reduction),
        "milling": _round_results(milling),
        "overall": _round_results({
            "total_energy_kwh": round(total_energy, 2),
            "total_water_l": round(request.beneficiation.water_l, 2),
            "total_waste_kg": round(total_waste, 2),
            **impacts,
        }),
    })
