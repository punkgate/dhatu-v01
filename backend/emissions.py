"""Provisional impact factors for the deterministic DHATU MVP model.

Values are configurable placeholders, not validated RMPL-specific factors.
"""

ELECTRICITY_EMISSION_FACTOR_KG_CO2_PER_KWH = 0.7
REDUCTANT_EMISSION_FACTOR_KG_CO2_PER_KG = 2.5
ELECTRICITY_COST_PER_KWH = 0.10
WATER_COST_PER_L = 0.0005
REDUCTANT_COST_PER_KG = 0.18
WASTE_HANDLING_COST_PER_KG = 0.015


def calculate_impacts(*, total_energy_kwh: float, total_water_l: float, reductant_kg: float, total_waste_kg: float) -> dict[str, float]:
    """Return provisional emissions and operating cost for one simulated batch."""
    estimated_co2 = total_energy_kwh * ELECTRICITY_EMISSION_FACTOR_KG_CO2_PER_KWH + reductant_kg * REDUCTANT_EMISSION_FACTOR_KG_CO2_PER_KG
    estimated_cost = total_energy_kwh * ELECTRICITY_COST_PER_KWH + total_water_l * WATER_COST_PER_L + reductant_kg * REDUCTANT_COST_PER_KG + total_waste_kg * WASTE_HANDLING_COST_PER_KG
    return {"estimated_co2_kg": round(estimated_co2, 2), "estimated_cost": round(estimated_cost, 2)}
