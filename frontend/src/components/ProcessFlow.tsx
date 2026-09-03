interface Stage {
  label: string;
  sub?: string;
}

interface Props {
  stages: Stage[];
  /** index of the stage currently processing, -1 for none */
  activeIndex?: number;
  /** index up to which stages are considered complete */
  completeUpTo?: number;
}

export default function ProcessFlow({ stages, activeIndex = -1, completeUpTo = -1 }: Props) {
  const n = stages.length;
  const nodeW = 128;
  const nodeH = 56;
  const gap = 36;
  const totalW = n * nodeW + (n - 1) * gap;
  const height = 96;
  const midY = height / 2;

  return (
    <div className="w-full overflow-x-auto border border-hairline bg-panel py-6">
      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        width={totalW}
        height={height}
        className="mx-auto block min-w-full"
        style={{ minWidth: totalW }}
      >
        {stages.map((stage, i) => {
          const x = i * (nodeW + gap);
          const isActive = i === activeIndex;
          const isComplete = i <= completeUpTo;
          const stroke = isActive
            ? "var(--color-accent-bright)"
            : isComplete
              ? "var(--color-accent-dim)"
              : "var(--color-hairline-strong)";
          const fill = isActive ? "var(--color-accent-wash)" : "var(--color-panel-raised)";
          const textColor = isActive || isComplete ? "var(--color-ink)" : "var(--color-ink-faint)";

          return (
            <g key={stage.label}>
              {i > 0 && (
                <line
                  x1={x - gap}
                  y1={midY}
                  x2={x}
                  y2={midY}
                  stroke={i - 1 <= completeUpTo ? "var(--color-accent-dim)" : "var(--color-hairline-strong)"}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  className={isActive || i - 1 === activeIndex ? "flow-active" : ""}
                />
              )}
              {i > 0 && (
                <polygon
                  points={`${x - 6},${midY - 4} ${x},${midY} ${x - 6},${midY + 4}`}
                  fill={i - 1 <= completeUpTo ? "var(--color-accent-dim)" : "var(--color-hairline-strong)"}
                />
              )}
              <rect
                x={x}
                y={midY - nodeH / 2}
                width={nodeW}
                height={nodeH}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
              />
              {/* corner ticks, instrumentation-drawing style */}
              <line x1={x} y1={midY - nodeH / 2} x2={x + 8} y2={midY - nodeH / 2} stroke={stroke} strokeWidth={1.5} />
              <line x1={x} y1={midY - nodeH / 2} x2={x} y2={midY - nodeH / 2 + 8} stroke={stroke} strokeWidth={1.5} />
              <line
                x1={x + nodeW}
                y1={midY + nodeH / 2}
                x2={x + nodeW - 8}
                y2={midY + nodeH / 2}
                stroke={stroke}
                strokeWidth={1.5}
              />
              <line
                x1={x + nodeW}
                y1={midY + nodeH / 2}
                x2={x + nodeW}
                y2={midY + nodeH / 2 - 8}
                stroke={stroke}
                strokeWidth={1.5}
              />
              <text
                x={x + nodeW / 2}
                y={stage.sub ? midY - 4 : midY + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="10.5"
                fontWeight={600}
                letterSpacing="0.03em"
                fill={textColor}
              >
                {stage.label}
              </text>
              {stage.sub && (
                <text
                  x={x + nodeW / 2}
                  y={midY + 12}
                  textAnchor="middle"
                  fontFamily="var(--font-sans)"
                  fontSize="9.5"
                  fill="var(--color-ink-faint)"
                >
                  {stage.sub}
                </text>
              )}
              {isActive && (
                <circle cx={x + nodeW - 10} cy={midY - nodeH / 2 + 10} r={3} fill="var(--color-accent-bright)">
                  <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
