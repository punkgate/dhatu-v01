# DHATU Migration and System Handoff Guide

## 1. Executive Summary

DHATU (Digital Holistic Analytics for Transformative Utilization) is an MVP process-intelligence application for converting manganese ore into manganese dioxide concentrate and manganese oxide/monoxide product.

The current application contains two independently runnable parts:

- **Backend:** Python FastAPI service for process simulation, optimization, ML inference, anomaly detection, and model metadata.
- **Frontend:** React 19 + TypeScript + Vite application for entering one batch of process conditions and viewing the results.

The modeled process is:

```text
Raw manganese ore
  -> Beneficiation (water, energy, recovery, concentrate grade, tailings)
  -> Thermal reduction (temperature, residence time, reductant, energy, MnO product)
  -> Milling and sizing (target mesh, energy, final and off-spec product)
  -> Quality checks, resource impact, ML prediction, anomaly status
  -> Optional constrained optimization recommendations
```

This is a demonstration and engineering-baseline system. The process equations, specifications, emission factors, cost factors, synthetic dataset, and trained models are explicitly provisional. They are not validated against plant or RMPL production data.

## 2. Current Completion Status

### Implemented

- End-to-end manganese process simulation for a single batch.
- Mass-balance checks for beneficiation and milling.
- Provisional product-quality estimation and specification checks.
- Energy, water, waste, CO2, and cost calculations.
- Constrained optimization for three objectives:
  - `maximum_recovery`
  - `minimum_impact`
  - `balanced`
- Reproducible synthetic dataset generation with 3,000 records and seven run classes.
- Four persisted scikit-learn/joblib model artifacts:
  - Process outcome regression.
  - Quality regression.
  - Specification classifier.
  - Isolation Forest anomaly detector.
- FastAPI routes for all backend capabilities.
- React UI with Dashboard, Analysis, and Model Info pages.
- Typed frontend API client and shared analysis state.
- Parallel frontend calls for prediction/anomaly checks and the three optimization modes.
- Backend executable regression checks and frontend production build configuration.

### Deliberately not implemented

- Authentication, users, roles, persistence, database, batch history, or audit logging.
- Production deployment configuration, Docker, CI/CD, reverse proxy, or secrets management.
- Streaming plant/SCADA/IoT data ingestion.
- File upload or laboratory-result ingestion.
- Satellite or geographic reserve-detection functionality.
- Real plant calibration, uncertainty intervals, model registry, drift monitoring, or retraining workflow.
- Multi-mineral generalization. The current implementation is manganese-specific.
- A backend field identifying one globally recommended optimization mode; the frontend derives that recommendation from returned results.

## 3. Repository Structure

```text
dhatu/
├── CODEX_INSTRUCTIONS.md          Product scope and engineering constraints
├── MIGRATION_GUIDE.md             This handoff document
├── backend/
│   ├── main.py                    FastAPI app and HTTP route handlers
│   ├── schemas.py                 Pydantic request/response contracts
│   ├── process_model.py            Deterministic process equations
│   ├── optimizer.py                Differential-evolution optimizer
│   ├── quality_model.py            Provisional quality equations and checks
│   ├── specifications.py           Centralized product limits
│   ├── emissions.py                Provisional impact and cost factors
│   ├── synthetic_data.py           Dataset generator
│   ├── synthetic_parameters.py     Dataset ranges, counts, coefficients
│   ├── requirements.txt             Python dependencies
│   ├── data/
│   │   ├── manganese_synthetic_3000.csv  Generated ML dataset
│   │   └── mn_process_data.csv           Additional source/data file
│   ├── ml/
│   │   ├── features.py              Shared feature definitions and API adapter
│   │   ├── train_models.py          Trains and persists all four artifacts
│   │   ├── predict.py               Loads artifacts and serves inference
│   │   ├── evaluate_models.py       Regression/classifier metric helpers
│   │   └── __init__.py
│   ├── models/
│   │   ├── process_model.joblib
│   │   ├── quality_regression_model.joblib
│   │   ├── quality_classifier.joblib
│   │   ├── anomaly_detector.joblib
│   │   └── metadata.json            Training metadata and evaluation metrics
│   └── test_*.py                    Executable regression checks
├── frontend/
│   ├── package.json                 Node scripts and dependencies
│   ├── package-lock.json
│   ├── vite.config.ts               Vite and Tailwind plugins
│   ├── .env.example                 Frontend API URL template
│   ├── src/
│   │   ├── App.tsx                  Page selection and provider root
│   │   ├── main.tsx                 React bootstrap
│   │   ├── index.css                Tailwind theme and global styling
│   │   ├── context/
│   │   │   ├── AnalysisContext.tsx  Shared input/results/loading state
│   │   │   └── useAnalysis.ts       Context hook
│   │   ├── services/api.ts           Only frontend fetch implementation
│   │   ├── types/api.ts              TypeScript mirror of backend contracts
│   │   ├── pages/                    Dashboard, Analysis, ModelInfo
│   │   ├── components/               Reusable UI and result components
│   │   └── lib/                      Defaults, formatting, recommendation logic
│   └── dist/                         Local Vite build output, if generated
└── .venv/                            Local Python virtual environment, if retained
```

## 4. Runtime Architecture and Data Flow

### Backend request flow

1. FastAPI validates JSON with Pydantic in `schemas.py`.
2. `/simulate` calls `process_model.run_process`.
3. `run_process` calls, in order:
   - `simulate_beneficiation`
   - `simulate_thermal_reduction`
   - `simulate_milling`
   - `calculate_impacts`
   - `predict_product_quality`
   - `check_specification`
4. `/optimize` calculates a baseline, then repeatedly calls the same `run_process` path for candidate configurations.
5. `/predict` first runs the deterministic process, then adapts the request/results into the shared ML feature frame and loads the persisted artifacts.
6. `/anomaly-check` uses the same feature adapter but selects the anomaly feature subset.
7. `/model-metrics` returns `backend/models/metadata.json` without exposing its filesystem path.

### Frontend analysis flow

`AnalysisContext.runAnalysis()` snapshots the current form input and executes:

1. `POST /simulate` first. If this fails, downstream calls are not made.
2. `POST /predict` and `POST /anomaly-check` in parallel.
3. `POST /optimize` three times in parallel, once for each optimization mode.

Each step has its own `idle`, `running`, `done`, or `error` state. A failed prediction or optimization call does not discard a successful simulation result.

The frontend has no router. `App.tsx` switches among three pages using local React state. `AnalysisProvider` remains mounted around all pages, so results remain available when navigating between Dashboard and Analysis.

## 5. Backend API Contract

The default backend address is `http://127.0.0.1:8000`.

### `GET /`

Health response:

```json
{"message":"DHATU API is running"}
```

### `POST /simulate`

Accepts a `SimulationRequest` and returns:

```json
{
  "status": "success",
  "process": "MnO/MnO2",
  "results": {
    "beneficiation": {},
    "thermal_reduction": {},
    "milling": {},
    "overall": {},
    "quality": {}
  }
}
```

Results are rounded for HTTP output to two decimal places. Internal process stages use full precision.

### `POST /optimize`

Accepts the simulation payload plus:

```json
{"mode":"maximum_recovery"}
```

Allowed modes are `maximum_recovery`, `minimum_impact`, and `balanced`. A successful response includes `baseline`, `optimized_parameters`, `optimized_results`, `recommended_configuration`, `expected_results`, `quality`, `optimization_details`, and `improvements`.

`recommended_configuration` and `optimized_parameters` are currently identical. `expected_results` and `optimized_results` are also currently identical. They are duplicated for frontend/product-language compatibility.

If no feasible candidate satisfies quality constraints, the response has status `no_feasible_solution` and a message instead of optimized results.

### `POST /predict`

Returns artifact-backed surrogate predictions:

```json
{
  "status":"success",
  "process_prediction": {},
  "quality_prediction": {},
  "specification_prediction": {
    "passes_specification": true,
    "probability": 0.0
  }
}
```

Returns HTTP 503 when required joblib artifacts are missing.

### `POST /anomaly-check`

Returns:

```json
{
  "status":"success",
  "is_anomaly":false,
  "anomaly_score":0.0,
  "classification":"normal"
}
```

`classification` is either `normal` or `anomaly`. A missing anomaly artifact produces HTTP 503.

### `GET /model-metrics`

Returns the persisted `metadata.json`. It includes dataset identity, feature names/count, training timestamp, target names, regression metrics, classifier metrics, and anomaly-detector summary. It returns HTTP 503 if metadata is missing.

## 6. Input Schema and Units

All values represent one complete batch. Masses are kilograms, water is litres, energy is kWh, temperature is degrees Celsius, residence time is minutes, reductant is kilograms, mesh is an integer, composition values are percentages on a `0..100` scale, and trace contaminants are ppm.

### Top-level fields

| Field | Type/range | Meaning |
|---|---|---|
| `feed_mass_kg` | `>0`, max 1,000,000 | Raw ore batch mass |
| `feed_mno2_percent` | `>0`, max 90 | Feed MnO2 grade |
| `feed_mn_percent` | optional, `0..100` | Feed Mn grade; inferred by ML if null |
| `feed_fe_percent` | `0..100` | Feed iron |
| `feed_sio2_percent` | `0..100` | Feed silica |
| `feed_al2o3_percent` | `0..100` | Feed alumina |
| `feed_moisture_percent` | `0..100` | Feed moisture |
| `feed_pb_ppm`, `feed_as_ppm`, `feed_cd_ppm`, `feed_hg_ppm` | `>=0` | Feed trace contaminants |

### Nested fields

`beneficiation`:

- `water_l`: `0..10,000` L.
- `energy_kwh`: `0..10,000` kWh.

`thermal_reduction`:

- `temperature_c`: `500..1,200` C.
- `residence_time_min`: `10..600` minutes.
- `reductant_kg`: `0..5,000` kg.
- `energy_kwh`: `0..20,000` kWh.
- `kiln_speed_rpm`: optional, `0.1..20` rpm. Accepted by the API and deterministic model, but not an optimizer-controlled parameter.

`milling`:

- `target_mesh`: integer `40..500`.
- `energy_kwh`: `0..10,000` kWh.
- `initial_particle_size_mm`: optional, `>0..100` mm. Accepted for contract completeness but not used in current equations.

## 7. Deterministic Process Model

### Beneficiation

- Water and beneficiation-energy factors are normalized against 850 L and 120 kWh and bounded from 0 to 1.5.
- Recovery is `78 + 10*water_factor + 6*energy_factor`, bounded to `65..94%` unless an explicit recovery control is supplied.
- Concentrate grade is feed MnO2 plus a resource-dependent uplift, bounded to `max(feed grade, 60)..90%`.
- Concentrate mass is `feed_mass * recovery / 100`.
- Tailings are `feed_mass - concentrate_mass`.

### Thermal reduction

Conversion is an optimum-shaped response around 850 C, 120 minutes, and 100 kg reductant. Energy is normalized against 420 kWh. Optional kiln speed is optimum-shaped around 2.5 rpm.

- Conversion efficiency is bounded to `45..96%`.
- MnO product mass is `concentrate_mass * conversion / 100`.
- `mn_recovery_percent` currently equals conversion efficiency; this is a naming/product-model simplification.
- `product_mn_content_percent` is fixed at approximately `77.50%` using the Mn fraction in MnO.

### Milling

- Required energy is `15 + (target_mesh - 40) * 0.40` kWh.
- Efficiency responds to energy adequacy and receives a penalty above mesh 200.
- Final product mass is `mno_product_mass * milling_efficiency / 100`.
- Off-spec mass is the remaining MnO product mass.

### Overall impacts

Total energy is the sum of the three stage energy inputs. Total water is beneficiation water. Total waste is tailings plus milling off-spec mass.

Current provisional factors in `emissions.py`:

| Factor | Value |
|---|---:|
| Electricity emissions | 0.7 kg CO2/kWh |
| Reductant emissions | 2.5 kg CO2/kg |
| Electricity cost | 0.10 per kWh |
| Water cost | 0.0005 per L |
| Reductant cost | 0.18 per kg |
| Waste handling cost | 0.015 per kg |

The API calls the cost field `overall.estimated_cost`; the ML target is named `estimated_cost_inr`. This mismatch is intentional in the current frontend types and must be normalized carefully during migration.

## 8. Quality and Specifications

`quality_model.py` generates provisional quality values from feed grade, conversion, operating deviation, and target mesh. `specifications.py` centralizes the current limits:

| Parameter | Current rule |
|---|---:|
| Mn content | minimum 60% |
| MnO content | minimum 78% |
| Iron | maximum 8% |
| Silica | maximum 8% |
| Alumina | maximum 5% |
| Residual MnO2 | maximum 2% |
| Moisture | maximum 1% |
| Final particle mesh | minimum 100 |
| Pb | maximum 200 ppm |
| As | maximum 100 ppm |
| Cd | maximum 30 ppm |
| Hg | maximum 1 ppm |
| Density | 1.80 to 1.90 kg/dm3 |
| Mesh passing | minimum 95% |

The live API quality result contains calculated base quality values and boolean checks. The optional trace-metal, density, and mesh-passing checks use defaults because `run_process` does not currently propagate feed trace values into its quality result. Synthetic-data generation augments these values separately. Treat this as a known correctness gap before using those checks for operational decisions.

## 9. Optimization Behavior

`optimizer.py` uses SciPy `differential_evolution` with a fixed seed of 42, 35 maximum iterations, population multiplier 8, and polishing enabled.

Only four values are optimized:

| Parameter | Bounds |
|---|---:|
| Temperature | 750..1000 C |
| Residence time | 60..240 min |
| Reductant | 50..200 kg |
| Target mesh | 100..300 |

Beneficiation settings, all energy inputs, water, kiln speed, and initial particle size remain fixed from the request.

- **Maximum recovery:** minimizes the negative of a recovery-heavy score using recovery and final product mass.
- **Minimum impact:** minimizes total energy + CO2 + waste, subject to at least 70% Mn recovery and passing specification.
- **Balanced:** combines normalized recovery, product mass, energy, CO2, waste, and cost using weights `0.35`, `0.25`, `0.10`, `0.12`, `0.10`, and `0.08`.

All candidate scoring reuses `run_process`, preventing the optimizer from drifting away from the displayed simulation equations.

## 10. ML Dataset and Artifacts

The generated dataset is `backend/data/manganese_synthetic_3000.csv` with exactly 3,000 rows:

| Run type | Rows |
|---|---:|
| normal | 1,500 |
| high_recovery | 300 |
| energy_inefficient | 300 |
| poor_feed | 250 |
| quality_failure | 250 |
| high_emission | 200 |
| process_anomaly | 200 |

Generation is reproducible with NumPy seed 42. The dataset is derived from the same provisional process relationships, plus controlled noise and impurity propagation. It is not experimental data.

The 20 process/quality input features are defined once in `backend/ml/features.py`. The anomaly detector uses an eight-feature subset. Training uses an 80/20 stratified split, Random Forest regressors/classifier, and an Isolation Forest trained on normal runs only. `metadata.json` is generated at training time and should travel with the exact model artifacts.

Do not copy joblib files between incompatible Python, scikit-learn, NumPy, or feature-schema versions without retraining or validating them. In the current workspace, the checked-in artifacts report scikit-learn 1.9.0 during unpickling while the active interpreter has scikit-learn 1.5.2; the existing ML regression check passes but emits `InconsistentVersionWarning`. Pin the training/runtime version or retrain the artifacts as part of migration.

## 11. Local Setup and Runbook on Windows

### Backend

From the repository root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

If model artifacts are missing or the dataset has changed:

```powershell
Set-Location backend
python synthetic_data.py
python -m ml.train_models
```

Start the API from `backend` so the existing absolute imports resolve:

```powershell
Set-Location backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API documentation is available at `http://127.0.0.1:8000/docs`.

### Frontend

In a second terminal:

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend defaults to `http://127.0.0.1:8000`. Set `VITE_API_BASE_URL` in `frontend/.env` when the migrated backend is hosted elsewhere, for example:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Useful frontend commands:

```powershell
npm run build
npm run lint
npm run preview
```

The Vite server uses `host: true`, so it can be exposed on the local network. Configure backend CORS for the actual frontend origin in a non-local deployment.

## 12. Validation Commands

The backend checks are executable scripts, not pytest-style test functions. Run from `backend`:

```powershell
python test_simulation_validation.py
python test_optimizer.py
python test_quality.py
python test_ml.py
python test_synthetic_data.py
```

Expected checks include mass conservation, finite outputs, optimizer bounds, specification-aware optimization, dataset shape/content, model artifact loading, and metadata shape. Run the frontend checks from `frontend`:

```powershell
npm run build
npm run lint
```

For a migrated installation, also manually round-trip the six routes using `/docs` or an API client, especially `/predict`, `/anomaly-check`, and all three `/optimize` modes.

## 13. Migration Checklist

1. Copy `backend/`, `frontend/`, `backend/models/`, and the generated dataset if reproducibility is required.
2. Preserve the backend working-directory assumption or refactor imports to package-relative imports before embedding it in another service.
3. Install Python dependencies from `backend/requirements.txt` in the target environment.
4. Verify the target Python/scikit-learn/joblib versions against the persisted artifacts; retrain if they are incompatible.
5. Start the API and confirm `GET /` and `/docs`.
6. Point `VITE_API_BASE_URL` to the migrated API.
7. Add the deployed frontend origin to FastAPI CORS.
8. Keep `frontend/src/types/api.ts` synchronized with `backend/schemas.py` and `backend/ml/predict.py`.
9. Decide whether to retain or rename the `estimated_cost` versus `estimated_cost_inr` distinction.
10. Fix or explicitly disable optional quality checks until trace values, density, and mesh-passing values are returned by the live process path.
11. Replace provisional specifications, impact factors, cost factors, and quality equations with approved domain data.
12. Add persistence, authentication, observability, rate limiting, and auditability before exposing the service beyond a controlled demonstration.

## 14. Recommended Integration Boundary

The cleanest way to connect DHATU to another project is to treat the backend API as the primary boundary and the frontend as an optional client.

The consuming project should:

- Send a complete `SimulationRequest` to `/simulate` for deterministic engineering results.
- Call `/predict` and `/anomaly-check` only when the model artifacts and compatible runtime are available.
- Call `/optimize` asynchronously because each mode performs many process evaluations and may take noticeably longer than simulation.
- Treat `passes_specification` as a provisional screening result, not certification.
- Persist the original request alongside each response if reproducibility or audit trails matter.

For deeper Python integration, import `run_process` and `optimize_process`, but first convert the backend into a proper package and replace its current top-level imports (`from emissions import ...`, etc.) with package-safe imports. For frontend integration, reuse `src/types/api.ts` and `src/services/api.ts`, or generate equivalent client types from the FastAPI OpenAPI schema after the API contract is stabilized.

## 15. Known Technical Risks

- **Scientific validity:** equations and factors are placeholders.
- **Synthetic-data circularity:** ML models learn patterns generated by the deterministic model, so strong metrics do not prove plant accuracy.
- **Quality data propagation:** live optional quality checks currently evaluate defaults rather than all supplied feed contaminants.
- **Artifact coupling:** joblib models depend on feature order and library/runtime compatibility.
- **Optimization cost:** three differential-evolution jobs run in parallel from the browser, and each job repeatedly evaluates the full quality path.
- **No request persistence:** refreshing or restarting the frontend loses the current analysis state.
- **CORS scope:** current origins are limited to localhost ports 5173 through 5175 and their loopback equivalents.
- **Input validation semantics:** Pydantic validates ranges but does not enforce that composition percentages sum to a physically meaningful total.
- **Naming ambiguity:** `mn_recovery_percent` represents thermal conversion in the current process model, and cost has two API names.

## 16. Next Development Milestones

### Milestone A: Integration hardening

- Package the backend for import-safe embedding.
- Generate or publish an OpenAPI client.
- Normalize response names and add API versioning.
- Add structured logging, request IDs, timeouts, and health/readiness checks.

### Milestone B: Domain calibration

- Replace synthetic training data with approved historical/lab data.
- Validate material balances and units with process engineers.
- Calibrate quality specifications and impact factors by product/site.
- Add confidence intervals and out-of-distribution warnings.

### Milestone C: Productization

- Add database-backed batch history and comparison.
- Add authentication and role-based access.
- Add file/lab-result ingestion and export.
- Add background jobs for optimization and model training.
- Add CI tests, containerization, deployment manifests, and monitoring.

## 17. Source-of-Truth Files

When behavior and documentation disagree, inspect these files in this order:

1. `backend/schemas.py` for accepted and returned API shapes.
2. `backend/process_model.py` for deterministic process behavior.
3. `backend/quality_model.py` and `backend/specifications.py` for quality behavior.
4. `backend/optimizer.py` for optimization bounds/objectives.
5. `backend/ml/features.py`, `train_models.py`, and `predict.py` for model compatibility.
6. `frontend/src/types/api.ts` and `frontend/src/services/api.ts` for client assumptions.
7. `frontend/src/context/AnalysisContext.tsx` for UI orchestration.
