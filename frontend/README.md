# DHATU Frontend

Frontend for DHATU — a manganese process intelligence platform. Built against
the real backend at [`punkgate/dhatu-v01`](https://github.com/punkgate/dhatu-v01),
schema-inspected directly (no invented endpoints or fields).

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts. No router — three
pages, switched by local state (see `src/App.tsx`).

## Run it

```bash
npm install
cp .env.example .env      # point VITE_API_BASE_URL at your running backend
npm run dev
```

The backend must be running separately:

```bash
cd ../dhatu-v01/backend
pip install -r requirements.txt
python -m ml.train_models    # only if backend/models/*.joblib don't exist yet
python -m uvicorn main:app --reload
```

Build for production: `npm run build` (output in `dist/`).

## Structure

```
src/
├── components/    # Sidebar, MetricCard, ProcessFlow, QualityTable,
│                  # AnomalyPanel, OptimizationComparison, etc.
├── pages/         # Dashboard, Analysis, ModelInfo
├── context/       # AnalysisContext — single source of truth for run state
├── services/api.ts  # the only place fetch() is called
├── types/api.ts   # mirrors backend/schemas.py + ml/predict.py exactly
└── lib/           # formatting + frontend recommendation scoring
```

## API integration summary

All six backend routes are wired:

| Route | Used by |
|---|---|
| `GET /` | (available, not called by UI) |
| `POST /simulate` | Run Analysis → step 1 |
| `POST /predict` | Run Analysis → step 2 (parallel with anomaly-check) |
| `POST /anomaly-check` | Run Analysis → step 2 |
| `POST /optimize` | Run Analysis → step 3, called once per mode (×3, parallel) |
| `GET /model-metrics` | Model Info page |

`runAnalysis()` in `AnalysisContext` sequences these exactly as specified:
simulate first (everything downstream reads the same request), then predict
+ anomaly together, then all three optimization modes together. Each step
tracks its own loading/error state independently — a failed `/optimize` call
doesn't hide a successful `/predict` result.

## Schema notes discovered during integration

- **Cost field name mismatch**: the engineering simulation (`/simulate`,
  `/optimize`) returns the cost field as `overall.estimated_cost`, but the ML
  prediction (`/predict`) returns the same quantity as
  `process_prediction.estimated_cost_inr`. Both are modeled as distinct,
  correctly-named fields in `types/api.ts` — they are not unified into one
  name, since that would misrepresent what each endpoint actually returns.
- **Quality table omissions**: `/simulate`'s `quality.checks` includes boolean
  results for `lead`, `arsenic`, `cadmium`, `mercury`, `density`, and
  `mesh_passing`, but the underlying numeric values for those checks are
  never populated by `quality_model.predict_product_quality` — they always
  evaluate against hardcoded defaults server-side (e.g. mercury vs. 0.0 ppm).
  The UI omits these rows entirely rather than show a "Pass" badge for a
  measurement the API never actually took.
- **No dedicated backend recommendation field**: `/optimize` doesn't return
  a "this is the best mode" flag, so `src/lib/recommend.ts` computes one
  client-side from the live `optimized_results` of whichever modes returned
  `status: "success"` and passed specification, using the same weighting the
  backend's own balanced-mode optimizer uses internally (see
  `backend/optimizer.py BALANCED_WEIGHTS`).
- **`feed_mn_percent`, `kiln_speed_rpm`, `initial_particle_size_mm`** are all
  optional in the backend schema and are rendered as optional fields in the
  form (empty by default, `null` sent if left blank).

## Verified against the live backend

Type-checked (`tsc -b`), production-built (`vite build`), and every request
shape round-tripped against a running instance of the actual FastAPI backend
before this was handed off — `/simulate`, `/predict`, `/anomaly-check`, all
three `/optimize` modes, and `/model-metrics` all returned exactly the shapes
encoded in `types/api.ts`.

## What's deliberately not built

Per the product brief, this frontend is scoped to the processing engine
only. A future satellite/geo-AI reserve-detection module is expected to sit
upstream of this app (feeding estimated ore characteristics into the Feed
Composition form) rather than being integrated into this codebase now.
