import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ApiError,
  checkAnomaly,
  optimizeProcess,
  predictProcess,
  simulateProcess,
} from "../services/api";
import type {
  AnomalyResponse,
  OptimizationMode,
  OptimizationResponse,
  PredictResponse,
  SimulationRequest,
  SimulationResponse,
} from "../types/api";
import { DEFAULT_INPUT } from "../lib/defaults";

export type StepStatus = "idle" | "running" | "done" | "error";

export type StepKey = "simulate" | "predict" | "anomaly" | "optimize";

export interface StepState {
  status: StepStatus;
  error?: string;
}

const OPTIMIZATION_MODES: OptimizationMode[] = ["maximum_recovery", "minimum_impact", "balanced"];

interface AnalysisState {
  input: SimulationRequest;
  simulation: SimulationResponse | null;
  prediction: PredictResponse | null;
  anomaly: AnomalyResponse | null;
  optimizationResults: Partial<Record<OptimizationMode, OptimizationResponse>>;
  steps: Record<StepKey, StepState>;
  hasRun: boolean;
  isRunning: boolean;
}

export interface AnalysisContextValue extends AnalysisState {
  setInput: (updater: (prev: SimulationRequest) => SimulationRequest) => void;
  runAnalysis: () => Promise<void>;
  reset: () => void;
}

const initialSteps: Record<StepKey, StepState> = {
  simulate: { status: "idle" },
  predict: { status: "idle" },
  anomaly: { status: "idle" },
  optimize: { status: "idle" },
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [input, setInputState] = useState<SimulationRequest>(DEFAULT_INPUT);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyResponse | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<
    Partial<Record<OptimizationMode, OptimizationResponse>>
  >({});
  const [steps, setSteps] = useState<Record<StepKey, StepState>>(initialSteps);
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const setInput = useCallback((updater: (prev: SimulationRequest) => SimulationRequest) => {
    setInputState(updater);
  }, []);

  const setStep = (key: StepKey, state: StepState) => {
    setSteps((prev) => ({ ...prev, [key]: state }));
  };

  const runAnalysis = useCallback(async () => {
    setIsRunning(true);
    setHasRun(true);
    setSteps({
      simulate: { status: "running" },
      predict: { status: "idle" },
      anomaly: { status: "idle" },
      optimize: { status: "idle" },
    });
    setSimulation(null);
    setPrediction(null);
    setAnomaly(null);
    setOptimizationResults({});

    const currentInput = input;

    // 1. Simulate first — every downstream step reads process context from it.
    try {
      const simResult = await simulateProcess(currentInput);
      setSimulation(simResult);
      setStep("simulate", { status: "done" });
    } catch (err) {
      setStep("simulate", { status: "error", error: describeError(err) });
      setIsRunning(false);
      return;
    }

    // 2. Predict and anomaly-check can run together.
    setStep("predict", { status: "running" });
    setStep("anomaly", { status: "running" });
    const [predictOutcome, anomalyOutcome] = await Promise.allSettled([
      predictProcess(currentInput),
      checkAnomaly(currentInput),
    ]);

    if (predictOutcome.status === "fulfilled") {
      setPrediction(predictOutcome.value);
      setStep("predict", { status: "done" });
    } else {
      setStep("predict", { status: "error", error: describeError(predictOutcome.reason) });
    }

    if (anomalyOutcome.status === "fulfilled") {
      setAnomaly(anomalyOutcome.value);
      setStep("anomaly", { status: "done" });
    } else {
      setStep("anomaly", { status: "error", error: describeError(anomalyOutcome.reason) });
    }

    // 3. All three optimization modes, in parallel.
    setStep("optimize", { status: "running" });
    const outcomes = await Promise.allSettled(
      OPTIMIZATION_MODES.map((mode) => optimizeProcess(currentInput, mode))
    );
    const nextResults: Partial<Record<OptimizationMode, OptimizationResponse>> = {};
    let optimizeFailed = false;
    let optimizeError = "";
    outcomes.forEach((outcome, index) => {
      const mode = OPTIMIZATION_MODES[index];
      if (outcome.status === "fulfilled") {
        nextResults[mode] = outcome.value;
      } else {
        optimizeFailed = true;
        optimizeError = describeError(outcome.reason);
      }
    });
    setOptimizationResults(nextResults);
    setStep("optimize", optimizeFailed ? { status: "error", error: optimizeError } : { status: "done" });

    setIsRunning(false);
  }, [input]);

  const reset = useCallback(() => {
    setSimulation(null);
    setPrediction(null);
    setAnomaly(null);
    setOptimizationResults({});
    setSteps(initialSteps);
    setHasRun(false);
  }, []);

  const value = useMemo<AnalysisContextValue>(
    () => ({
      input,
      simulation,
      prediction,
      anomaly,
      optimizationResults,
      steps,
      hasRun,
      isRunning,
      setInput,
      runAnalysis,
      reset,
    }),
    [input, simulation, prediction, anomaly, optimizationResults, steps, hasRun, isRunning, setInput, runAnalysis, reset]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unknown error.";
}

export { AnalysisContext };
