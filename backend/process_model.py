"""Deterministic, calibratable process equations for the manganese MVP.

This is a process-model baseline, not a trained ML model. Constants are grouped
here so they can be calibrated against plant data later.
"""

from math import exp

MNO2_TO_MNO_MASS_RATIO = 70.937 / 86.936
MNO2_TO_C_STOICHIOMETRIC_RATIO = 12.011 / 86.936
MN_CONTENT_IN_MNO_PERCENT = 54.938 / 70.937 * 100


def _bounded(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def simulate_beneficiation(*, feed_mass_kg: float, feed_mno2_percent: float, water_l: float, energy_kwh: float) -> dict[str, float]:
    """Upgrade MnO2 grade while conserving the total feed mass.

    ``recovery_percent`` is a concentrate mass recovery for this MVP.  It is
    converted to a fraction exactly once before calculating kilograms.
    """
    water_per_tonne = water_l / feed_mass_kg * 1_000
    energy_per_tonne = energy_kwh / feed_mass_kg * 1_000
    recovery = _bounded(74 + 0.025 * water_per_tonne + 0.055 * energy_per_tonne, 65, 94)
    grade_uplift = _bounded(8 + 0.006 * water_per_tonne + 0.012 * energy_per_tonne, 4, 22)
    concentrate_grade = _bounded(feed_mno2_percent + grade_uplift, max(feed_mno2_percent, 60), 90)
    recovery_fraction = recovery / 100
    concentrate_mass = feed_mass_kg * recovery_fraction
    tailings_mass = feed_mass_kg - concentrate_mass
    return {
        "recovery_percent": recovery,
        "concentrate_mass_kg": concentrate_mass,
        "concentrate_mno2_percent": concentrate_grade,
        "tailings_mass_kg": tailings_mass,
    }


def simulate_thermal_reduction(*, concentrate_mass_kg: float, concentrate_mno2_percent: float, temperature_c: float, residence_time_min: float, reductant_kg: float, energy_kwh: float, kiln_speed_rpm: float | None = None) -> dict[str, float]:
    """Reduce MnO2 to MnO using an optimum-window conversion relationship."""
    mno2_feed_kg = concentrate_mass_kg * concentrate_mno2_percent / 100
    stoichiometric_carbon_kg = mno2_feed_kg * MNO2_TO_C_STOICHIOMETRIC_RATIO
    reductant_ratio = reductant_kg / max(stoichiometric_carbon_kg, 0.001)
    temperature_factor = exp(-((temperature_c - 850) / 135) ** 2)
    residence_factor = exp(-((residence_time_min - 120) / 95) ** 2)
    reductant_factor = exp(-((reductant_ratio - 1.15) / 0.60) ** 2)
    energy_factor = _bounded((energy_kwh / max(mno2_feed_kg, 0.001)) / 0.75, 0.35, 1.0)
    kiln_factor = 1.0 if kiln_speed_rpm is None else exp(-((kiln_speed_rpm - 2.5) / 2.0) ** 2)
    conversion = _bounded(52 + 44 * temperature_factor * residence_factor * reductant_factor * energy_factor * kiln_factor, 45, 96)
    mno_product_mass = mno2_feed_kg * conversion / 100 * MNO2_TO_MNO_MASS_RATIO
    return {
        "conversion_efficiency_percent": conversion,
        "mno_product_mass_kg": mno_product_mass,
        "mn_recovery_percent": conversion,
        "product_mn_content_percent": MN_CONTENT_IN_MNO_PERCENT,
    }


def simulate_milling(*, mno_product_mass_kg: float, target_mesh: int, energy_kwh: float) -> dict[str, float]:
    """Estimate on-spec output; finer meshes require more specific energy."""
    required_energy_per_kg = 0.025 + (target_mesh - 40) * 0.00022
    energy_adequacy = _bounded((energy_kwh / max(mno_product_mass_kg, 0.001)) / required_energy_per_kg, 0, 1.15)
    fineness_penalty = max(target_mesh - 200, 0) * 0.012
    efficiency = _bounded(80 + 16 * min(energy_adequacy, 1) - fineness_penalty, 60, 97)
    final_product_mass = mno_product_mass_kg * efficiency / 100
    off_spec_mass = mno_product_mass_kg - final_product_mass
    return {
        "milling_efficiency_percent": efficiency,
        "final_product_mass_kg": final_product_mass,
        "off_spec_mass_kg": off_spec_mass,
        "final_particle_mesh": float(target_mesh),
    }
