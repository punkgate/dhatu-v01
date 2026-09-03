import type {
  AnomalyResponse,
  ApiErrorDetail,
  ModelMetricsResponse,
  OptimizationMode,
  OptimizationResponse,
  PredictResponse,
  SimulationRequest,
  SimulationResponse,
} from "../types/api";

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.status = detail.status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError({
      status: 0,
      message: `Could not reach the DHATU API at ${BASE_URL}. Confirm the backend is running.`,
    });
  }

  if (!response.ok) {
    let message = `Request to ${path} failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        // FastAPI/Pydantic validation error array
        message = body.detail
          .map((item: { loc?: (string | number)[]; msg?: string }) =>
            `${(item.loc ?? []).join(".")}: ${item.msg ?? "invalid value"}`
          )
          .join("; ");
      }
    } catch {
      // response body wasn't JSON; keep the generic message
    }
    throw new ApiError({ status: response.status, message });
  }

  return response.json() as Promise<T>;
}

export function healthCheck(): Promise<{ message: string }> {
  return request("/");
}

export function simulateProcess(payload: SimulationRequest): Promise<SimulationResponse> {
  return request("/simulate", { method: "POST", body: JSON.stringify(payload) });
}

export function optimizeProcess(
  payload: SimulationRequest,
  mode: OptimizationMode
): Promise<OptimizationResponse> {
  return request("/optimize", {
    method: "POST",
    body: JSON.stringify({ ...payload, mode }),
  });
}

export function predictProcess(payload: SimulationRequest): Promise<PredictResponse> {
  return request("/predict", { method: "POST", body: JSON.stringify(payload) });
}

export function checkAnomaly(payload: SimulationRequest): Promise<AnomalyResponse> {
  return request("/anomaly-check", { method: "POST", body: JSON.stringify(payload) });
}

export function getModelMetrics(): Promise<ModelMetricsResponse> {
  return request("/model-metrics");
}
