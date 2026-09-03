"""FastAPI entry point for the DHATU process-model baseline."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from optimizer import optimize_process
from process_model import run_process
from schemas import OptimizationRequest, OptimizationResponse, SimulationRequest, SimulationResponse
from ml.predict import predict_anomaly, predict_process_and_quality
from ml.train_models import MODELS_PATH

app = FastAPI(title="DHATU API", version="0.1.0", description="Manganese process simulation baseline.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _round_results(values: dict[str, object], digits: int = 2) -> dict[str, object]:
    """Round only API output; process stages always exchange full-precision values."""
    def round_value(value: object) -> object:
        if isinstance(value, float):
            return round(value, digits)
        if isinstance(value, dict):
            return {key: round_value(nested_value) for key, nested_value in value.items()}
        if isinstance(value, list):
            return [round_value(item) for item in value]
        return value

    return {key: round_value(value) for key, value in values.items()}


@app.get("/")
def health_check() -> dict[str, str]:
    return {"message": "DHATU API is running"}


@app.post("/simulate", response_model=SimulationResponse)
def simulate_process(request: SimulationRequest) -> SimulationResponse:
    """Simulate beneficiation, reduction, milling, and provisional impacts."""
    results = run_process(request)
    return SimulationResponse(results={
        section: _round_results(values) for section, values in results.items()
    })


@app.post("/optimize", response_model=OptimizationResponse)
def optimize(request: OptimizationRequest) -> OptimizationResponse:
    """Return a constrained process-model recommendation for the selected mode."""
    baseline = run_process(request)
    optimization = optimize_process(request, request.mode)
    if optimization is None:
        return OptimizationResponse(
            status="no_feasible_solution",
            mode=request.mode,
            message="No configuration satisfies all process and product quality constraints.",
        )
    optimized_parameters = optimization["configuration"]
    optimized_results = optimization["results"]
    baseline_reduction = baseline["thermal_reduction"]
    baseline_milling = baseline["milling"]
    baseline_overall = baseline["overall"]
    optimized_reduction = optimized_results["thermal_reduction"]
    optimized_milling = optimized_results["milling"]
    optimized_overall = optimized_results["overall"]
    improvements = {
        "mn_recovery_change_percent": optimized_reduction["mn_recovery_percent"] - baseline_reduction["mn_recovery_percent"],
        "product_mass_change_kg": optimized_milling["final_product_mass_kg"] - baseline_milling["final_product_mass_kg"],
        "energy_change_kwh": optimized_overall["total_energy_kwh"] - baseline_overall["total_energy_kwh"],
        "co2_change_kg": optimized_overall["estimated_co2_kg"] - baseline_overall["estimated_co2_kg"],
        "waste_change_kg": optimized_overall["total_waste_kg"] - baseline_overall["total_waste_kg"],
        "cost_change_inr": optimized_overall["estimated_cost"] - baseline_overall["estimated_cost"],
    }
    return OptimizationResponse(
        mode=request.mode,
        baseline={section: _round_results(values) for section, values in baseline.items()},
        optimized_parameters=_round_results(optimized_parameters),
        optimized_results={section: _round_results(values) for section, values in optimized_results.items()},
        recommended_configuration=_round_results(optimized_parameters),
        expected_results={section: _round_results(values) for section, values in optimized_results.items()},
        quality=_round_results(optimization["quality"]),
        optimization_details={"objective": request.mode, "score": round(optimization["score"], 6)},
        improvements=_round_results(improvements),
    )


@app.post("/predict")
def predict(request: SimulationRequest) -> dict[str, object]:
    """Return artifact-backed process, quality, and specification predictions."""
    results = run_process(request)
    try:
        predictions = predict_process_and_quality(request, results)
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"status": "success", **predictions}


@app.post("/anomaly-check")
def anomaly_check(request: SimulationRequest) -> dict[str, object]:
    """Classify the request using the trained normal-operation detector."""
    results = run_process(request)
    try:
        anomaly = predict_anomaly(request, results)
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"status": "success", **anomaly}


@app.get("/model-metrics")
def model_metrics() -> dict[str, object]:
    """Expose persisted evaluation metadata without internal artifact paths."""
    metadata_path = MODELS_PATH / "metadata.json"
    if not metadata_path.exists():
        raise HTTPException(status_code=503, detail="Model metadata is missing. Run `python -m ml.train_models` first.")
    import json
    return json.loads(metadata_path.read_text(encoding="utf-8"))
