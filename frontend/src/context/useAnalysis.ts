import { useContext } from "react";
import { AnalysisContext, type AnalysisContextValue } from "./AnalysisContext";

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}