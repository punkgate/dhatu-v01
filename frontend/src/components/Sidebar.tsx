import type { Page } from "../App";

const NAV: { key: Page; label: string; mark: string }[] = [
  { key: "dashboard", label: "Dashboard", mark: "01" },
  { key: "analysis", label: "Run Analysis", mark: "02" },
  { key: "model-info", label: "Model Info", mark: "03" },
];

interface Props {
  active: Page;
  onNavigate: (page: Page) => void;
}

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="app-sidebar flex h-screen w-64 shrink-0 flex-col border-r border-hairline bg-panel">
      <div className="sidebar-header border-b border-hairline px-5 py-5">
        <div className="flex items-baseline gap-2">
          <span className="sidebar-wordmark font-heading text-xl font-bold tracking-tight text-ink">DHATU</span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </div>
        <p className="sidebar-description mt-1 text-[13px] leading-snug text-ink-faint">
          Manganese Process Intelligence
        </p>
      </div>

      <nav className="sidebar-nav flex-1 px-2 py-4">
        {NAV.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`sidebar-link group mb-1 flex w-full items-center gap-3 border-l-2 px-3 py-3.5 text-left text-[15px] transition-colors ${
                isActive
                  ? "border-accent bg-accent-wash text-ink"
                  : "border-transparent text-ink-dim hover:border-hairline-strong hover:bg-panel-raised hover:text-ink"
              }`}
            >
              <span className="sidebar-mark font-mono text-[10px] text-ink-faint">{item.mark}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-note border-t border-hairline px-5 py-4">
        <p className="text-[10px] leading-relaxed text-ink-faint">
          Engineering-constrained synthetic data.
          <br />
          Not validated against plant operation.
        </p>
      </div>
    </aside>
  );
}
