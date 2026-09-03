import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  mark: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function Section({ title, mark, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-hairline bg-panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-[10px] text-ink-faint">{mark}</span>
          <span className="text-base font-semibold text-ink">{title}</span>
        </span>
        <span className="font-mono text-xs text-ink-faint">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-hairline px-4 py-4">{children}</div>}
    </div>
  );
}
