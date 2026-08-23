"""Deterministic, unit-safe process equations for the DHATU manganese MVP.

All mass inputs and outputs are absolute kilograms for one batch. Resource
inputs are absolute batch quantities (litres and kWh), never per-tonne values.
Percentages stay on the 0--100 scale until a mass calculation needs a fraction.
"""

from math import exp

MN_CONTENT_IN_MNO_PERCENT = 54.938 / 70.937 * 100


def _bounded(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def simulate_beneficiation(*, feed_mass_kg: float, feed_mno2_percent: float, water_l: float, energy_kwh: float) -> dict[str, float]:
    """Calculate concentrate and tailings in kg from the complete feed mass."""
    # These response curves use absolute batch resource inputs; no values are
    # converted to tonnes, normalised, or used to scale resource totals.
    water_factor = _bounded(water_l / 850.0, 0.0, 1.5)
    energy_factor = _bounded(energy_kwh / 120.0, 0.0, 1.5)
    recovery_percent = _bounded(78.0 + 10.0 * water_factor + 6.0 * energy_factor, 65.0, 94.0)
    grade_uplift_percent = _bounded(7.0 + 5.0 * water_factor + 3.0 * energy_factor, 4.0, 20.0)
    concentrate_grade_percent = _bounded(feed_mno2_percent + grade_uplift_percent, max(feed_mno2_percent, 60.0), 90.0)

    # Convert the percentage exactly once when calculating a mass.
    recovery_fraction = recovery_percent / 100.0
    concentrate_mass_kg = feed_mass_kg * recovery_fraction
    tailings_mass_kg = feed_mass_kg - concentrate_mass_kg

    assert abs((concentrate_mass_kg + tailings_mass_kg) - feed_mass_kg) < 0.001
    return {
        "recovery_percent": recovery_percent,
        "concentrate_mass_kg": concentrate_mass_kg,
        "concentrate_mno2_percent": concentrate_grade_percent,
        "tailings_mass_kg": tailings_mass_kg,
    }


def simulate_thermal_reduction(*, concentrate_mass_kg: float, concentrate_mno2_percent: float, temperature_c: float, residence_time_min: float, reductant_kg: float, energy_kwh: float, kiln_speed_rpm: float | None = None) -> dict[str, float]:
    """Calculate MnO mass from the concentrate mass and conversion percentage."""
    # A bounded optimum region prevents the baseline from treating every larger
    # operating input as better. All inputs remain in the schema's base units.
    temperature_factor = exp(-((temperature_c - 850.0) / 135.0) ** 2)
    residence_factor = exp(-((residence_time_min - 120.0) / 95.0) ** 2)
    reductant_factor = exp(-((reductant_kg - 100.0) / 65.0) ** 2)
    energy_factor = _bounded(energy_kwh / 420.0, 0.0, 1.0)
    kiln_factor = 1.0 if kiln_speed_rpm is None else exp(-((kiln_speed_rpm - 2.5) / 2.0) ** 2)
    conversion_efficiency_percent = _bounded(52.0 + 44.0 * temperature_factor * residence_factor * reductant_factor * energy_factor * kiln_factor, 45.0, 96.0)

    conversion_fraction = conversion_efficiency_percent / 100.0
    mno_product_mass_kg = concentrate_mass_kg * conversion_fraction
    return {
        "conversion_efficiency_percent": conversion_efficiency_percent,
        "mno_product_mass_kg": mno_product_mass_kg,
        "mn_recovery_percent": conversion_efficiency_percent,
        "product_mn_content_percent": MN_CONTENT_IN_MNO_PERCENT,
    }


def simulate_milling(*, mno_product_mass_kg: float, target_mesh: int, energy_kwh: float) -> dict[str, float]:
    """Split the complete MnO product mass into on-spec and off-spec kg."""
    required_energy_kwh = 15.0 + (target_mesh - 40) * 0.40
    energy_adequacy = _bounded(energy_kwh / required_energy_kwh, 0.0, 1.15)
    fineness_penalty_percent = max(target_mesh - 200, 0) * 0.012
    milling_efficiency_percent = _bounded(80.0 + 16.0 * min(energy_adequacy, 1.0) - fineness_penalty_percent, 60.0, 97.0)

    milling_fraction = milling_efficiency_percent / 100.0
    final_product_mass_kg = mno_product_mass_kg * milling_fraction
    off_spec_mass_kg = mno_product_mass_kg - final_product_mass_kg

    assert abs((final_product_mass_kg + off_spec_mass_kg) - mno_product_mass_kg) < 0.001
    return {
        "milling_efficiency_percent": milling_efficiency_percent,
        "final_product_mass_kg": final_product_mass_kg,
        "off_spec_mass_kg": off_spec_mass_kg,
        "final_particle_mesh": float(target_mesh),
    }
