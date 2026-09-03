import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
import ModelInfo from "./pages/ModelInfo";
import { AnalysisProvider } from "./context/AnalysisContext";

export type Page = "dashboard" | "analysis" | "model-info";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <AnalysisProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar active={page} onNavigate={setPage} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          {page === "dashboard" && <Dashboard onNavigate={setPage} />}
          {page === "analysis" && <Analysis />}
          {page === "model-info" && <ModelInfo />}
        </main>
      </div>
    </AnalysisProvider>
  );
}
