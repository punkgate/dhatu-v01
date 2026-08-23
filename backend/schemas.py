"""Pydantic request and response schemas for the DHATU MVP API."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class BeneficiationInput(BaseModel):
    water_l: float = Field(ge=0, le=10_000, description="Water used during beneficiation.")
    energy_kwh: float = Field(ge=0, le=10_000, description="Electricity used during beneficiation.")


class ThermalReductionInput(BaseModel):
    temperature_c: float = Field(ge=500, le=1_200)
    residence_time_min: float = Field(ge=10, le=600)
    reductant_kg: float = Field(ge=0, le=5_000)
    energy_kwh: float = Field(ge=0, le=20_000)
    kiln_speed_rpm: float | None = Field(default=None, ge=0.1, le=20)


class MillingInput(BaseModel):
    target_mesh: int = Field(ge=40, le=500)
    energy_kwh: float = Field(ge=0, le=10_000)
    initial_particle_size_mm: float | None = Field(default=None, gt=0, le=100)


class SimulationRequest(BaseModel):
    feed_mass_kg: float = Field(gt=0, le=1_000_000)
    # A concentrate cannot both improve on a feed above 90% and remain in the
    # MVP's 60--90% concentrate-grade range.
    feed_mno2_percent: float = Field(gt=0, le=90)
    feed_mn_percent: float | None = Field(default=None, ge=0, le=100)
    feed_fe_percent: float = Field(default=0, ge=0, le=100)
    feed_sio2_percent: float = Field(default=0, ge=0, le=100)
    feed_al2o3_percent: float = Field(default=0, ge=0, le=100)
    feed_moisture_percent: float = Field(default=0, ge=0, le=100)
    feed_pb_ppm: float = Field(default=0, ge=0)
    feed_as_ppm: float = Field(default=0, ge=0)
    feed_cd_ppm: float = Field(default=0, ge=0)
    feed_hg_ppm: float = Field(default=0, ge=0)
    beneficiation: BeneficiationInput
    thermal_reduction: ThermalReductionInput
    milling: MillingInput


class SimulationResponse(BaseModel):
    status: str = "success"
    process: str = "MnO/MnO2"
    results: dict[str, dict[str, Any]]


class OptimizationRequest(SimulationRequest):
    mode: Literal["maximum_recovery", "minimum_impact", "balanced"]


class OptimizationResponse(BaseModel):
    status: str = "success"
    mode: str
    baseline: dict[str, dict[str, Any]] | None = None
    optimized_parameters: dict[str, float] | None = None
    optimized_results: dict[str, dict[str, Any]] | None = None
    improvements: dict[str, float] | None = None
    message: str | None = None
