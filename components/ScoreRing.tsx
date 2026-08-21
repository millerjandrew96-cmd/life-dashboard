function bandColor(score: number): string {
  if (score >= 90) return "#eab308"; // gold
  if (score >= 70) return "#10b981"; // green
  if (score >= 50) return "#f59e0b"; // yellow/amber
  return "#ef4444"; // red
}

export function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const color = bandColor(clamped);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${clamped} out of 100`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-black/10 dark:text-white/10"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.26} fontWeight={700} fill="currentColor">
        {Math.round(clamped)}
      </text>
    </svg>
  );
}
