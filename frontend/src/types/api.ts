/**
 * Types mirror backend/schemas.py, backend/ml/predict.py, and
 * backend/models/metadata.json exactly. Do not add fields the backend
 * does not return; do not rename fields to "look nicer" on the frontend.
 */

export interface BeneficiationInput {
  water_l: number;
  energy_kwh: number;
}

export interface ThermalReductionInput {
  temperature_c: number;
  residence_time_min: number;
  reductant_kg: number;
  energy_kwh: number;
  kiln_speed_rpm?: number | null;
}

export interface MillingInput {
  target_mesh: number;
  energy_kwh: number;
  initial_particle_size_mm?: number | null;
}

export interface SimulationRequest {
  feed_mass_kg: number;
  feed_mno2_percent: number;
  feed_mn_percent?: number | null;
  feed_fe_percent: number;
  feed_sio2_percent: number;
  feed_al2o3_percent: number;
  feed_moisture_percent: number;
  feed_pb_ppm: number;
  feed_as_ppm: number;
  feed_cd_ppm: number;
  feed_hg_ppm: number;
  beneficiation: BeneficiationInput;
  thermal_reduction: ThermalReductionInput;
  milling: MillingInput;
}

export type OptimizationMode = "maximum_recovery" | "minimum_impact" | "balanced";

export interface OptimizationRequest extends SimulationRequest {
  mode: OptimizationMode;
}

// ---- /simulate and /optimize shared "results" section shapes ----

export interface BeneficiationResult {
  recovery_percent: number;
  concentrate_mass_kg: number;
  concentrate_mno2_percent: number;
  tailings_mass_kg: number;
}

export interface ThermalReductionResult {
  conversion_efficiency_percent: number;
  mno_product_mass_kg: number;
  mn_recovery_percent: number;
  product_mn_content_percent: number;
}

export interface MillingResult {
  milling_efficiency_percent: number;
  final_product_mass_kg: number;
  off_spec_mass_kg: number;
  final_particle_mesh: number;
}

export interface OverallResult {
  total_energy_kwh: number;
  total_water_l: number;
  total_waste_kg: number;
  estimated_co2_kg: number;
  // Note: named "estimated_cost" in /simulate + /optimize, but the ML
  // prediction target for the same quantity is "estimated_cost_inr".
  // This is a real backend naming mismatch — see README.
  estimated_cost: number;
}

export interface QualityResult {
  mn_content_percent: number;
  mno_percent: number;
  iron_percent: number;
  silica_percent: number;
  alumina_percent: number;
  residual_mno2_percent: number;
  moisture_percent: number;
  final_particle_mesh: number;
  passes_specification: boolean;
  failed_parameters: string[];
  checks: Record<string, boolean>;
}

export interface ProcessResults {
  beneficiation: BeneficiationResult;
  thermal_reduction: ThermalReductionResult;
  milling: MillingResult;
  overall: OverallResult;
  quality: QualityResult;
}

export interface SimulationResponse {
  status: string;
  process: string;
  results: ProcessResults;
}

export interface OptimizedParameters {
  temperature_c: number;
  residence_time_min: number;
  reductant_kg: number;
  target_mesh: number;
}

export interface OptimizationImprovements {
  mn_recovery_change_percent: number;
  product_mass_change_kg: number;
  energy_change_kwh: number;
  co2_change_kg: number;
  waste_change_kg: number;
  cost_change_inr: number;
}

export interface OptimizationResponse {
  status: "success" | "no_feasible_solution";
  mode: OptimizationMode;
  baseline?: ProcessResults | null;
  optimized_parameters?: OptimizedParameters | null;
  optimized_results?: ProcessResults | null;
  recommended_configuration?: OptimizedParameters | null;
  expected_results?: ProcessResults | null;
  quality?: QualityResult | null;
  optimization_details?: { objective: OptimizationMode; score: number } | null;
  improvements?: OptimizationImprovements | null;
  message?: string | null;
}

// ---- /predict ----

export interface ProcessPrediction {
  mn_recovery_percent: number;
  final_product_mass_kg: number;
  total_energy_kwh: number;
  estimated_co2_kg: number;
  estimated_cost_inr: number;
}

export interface QualityPrediction {
  final_mn_percent: number;
  final_mno_percent: number;
  final_fe_percent: number;
  final_sio2_percent: number;
  final_al2o3_percent: number;
  residual_mno2_percent: number;
  moisture_percent: number;
  pb_ppm: number;
  as_ppm: number;
  cd_ppm: number;
  hg_ppm: number;
  density_kg_dm3: number;
  mesh_passing_percent: number;
}

export interface SpecificationPrediction {
  passes_specification: boolean;
  probability: number;
}

export interface PredictResponse {
  status: string;
  process_prediction: ProcessPrediction;
  quality_prediction: QualityPrediction;
  specification_prediction: SpecificationPrediction;
}

// ---- /anomaly-check ----

export interface AnomalyResponse {
  status: string;
  is_anomaly: boolean;
  anomaly_score: number;
  classification: "normal" | "anomaly";
}

// ---- /model-metrics ----

export interface MetricTriplet {
  mae: number;
  rmse: number;
  r2: number;
}

export interface ClassifierMetrics {
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  accuracy: number;
}

export interface AnomalyDetectionSummary {
  training_population: number;
  normal_detection_rate: number;
  known_unusual_detection_rate: number;
  features: string[];
}

export interface ModelMetricsResponse {
  dataset_name: string;
  dataset_rows: number;
  data_type: string;
  random_seed: number;
  feature_columns: string[];
  feature_count: number;
  training_timestamp: string;
  process_prediction_targets: string[];
  quality_prediction_targets: string[];
  process_model_metrics: Record<string, MetricTriplet>;
  quality_regression_metrics: Record<string, MetricTriplet>;
  quality_classifier_metrics: ClassifierMetrics;
  anomaly_detection_summary: AnomalyDetectionSummary;
}

// ---- API error shape (FastAPI HTTPException / validation error) ----

export interface ApiErrorDetail {
  status: number;
  message: string;
}
