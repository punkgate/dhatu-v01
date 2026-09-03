interface Props {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  optional?: boolean;
}

export default function NumberField({ label, value, onChange, min, max, step = 1, unit, optional }: Props) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] text-ink-dim">
          {label}
          {optional && <span className="ml-1 text-ink-faint">(optional)</span>}
        </span>
        {unit && <span className="font-mono text-[12px] text-ink-faint">{unit}</span>}
      </div>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder={optional ? "—" : undefined}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        className="w-full border border-hairline bg-panel-raised px-3 py-2 font-mono text-[15px] text-ink outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}
