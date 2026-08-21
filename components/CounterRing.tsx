/** Same footprint as ScoreRing but for a plain countdown number rather than a 0-100 progress arc. */
export function CounterRing({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const color = value === 0 ? "#10b981" : "currentColor";

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-black/10 dark:text-white/10"
          strokeWidth={stroke}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.26}
          fontWeight={700}
          fill={color}
          className={value === 0 ? "" : "text-black dark:text-white"}
        >
          {value}
        </text>
      </svg>
      <span className="max-w-[9rem] text-center text-xs text-black/50 dark:text-white/50">{label}</span>
    </div>
  );
}
