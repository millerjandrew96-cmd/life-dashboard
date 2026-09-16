import { gradeFor, gradeColor } from "@/lib/grade";

// Small corner badge on each home page tile — a quick-scan grade without reading the tile's
// own ring/stats.
export function GradeChip({ score }: { score: number }) {
  const grade = gradeFor(score);
  return (
    <span
      className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-current text-xs font-bold ${gradeColor(grade)}`}
    >
      {grade}
    </span>
  );
}
