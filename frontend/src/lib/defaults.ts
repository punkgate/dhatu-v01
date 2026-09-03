import type { SimulationRequest } from "../types/api";

// Matches the sample payload verified against the live backend during
// Milestone 5 route checks — a known-valid starting point for the form.
export const DEFAULT_INPUT: SimulationRequest = {
  feed_mass_kg: 1000,
  feed_mno2_percent: 65,
  feed_mn_percent: null,
  feed_fe_percent: 4,
  feed_sio2_percent: 4,
  feed_al2o3_percent: 2,
  feed_moisture_percent: 1,
  feed_pb_ppm: 50,
  feed_as_ppm: 25,
  feed_cd_ppm: 5,
  feed_hg_ppm: 0.2,
  beneficiation: {
    water_l: 850,
    energy_kwh: 120,
  },
  thermal_reduction: {
    temperature_c: 850,
    residence_time_min: 120,
    reductant_kg: 100,
    energy_kwh: 420,
    kiln_speed_rpm: null,
  },
  milling: {
    target_mesh: 200,
    energy_kwh: 80,
    initial_particle_size_mm: null,
  },
};
