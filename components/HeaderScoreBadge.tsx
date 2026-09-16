import { ScoreRing } from "@/components/ScoreRing";
import { gradeFor, gradeColor } from "@/lib/grade";

// The sticky page header's score indicator — a big letter grade immediately to the left of
// the same ring rendered larger elsewhere on the page, so the grade reads first at a glance.
export function HeaderScoreBadge({ score }: { score: number }) {
  const grade = gradeFor(score);
  return (
    <div className="flex items-center gap-2">
      <span className={`text-4xl font-black leading-none ${gradeColor(grade)}`}>{grade}</span>
      <ScoreRing score={score} size={40} />
    </div>
  );
}
