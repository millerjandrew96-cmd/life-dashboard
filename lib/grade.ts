// Shared by every pillar (and the home page's Overall tile) — a plain 0-100 score to a
// letter grade, and that letter to a Tailwind text-color class matching the app's tier colors.
export function gradeFor(totalScore: number): string {
  if (totalScore >= 93) return "A";
  if (totalScore >= 90) return "A-";
  if (totalScore >= 87) return "B+";
  if (totalScore >= 83) return "B";
  if (totalScore >= 80) return "B-";
  if (totalScore >= 77) return "C+";
  if (totalScore >= 73) return "C";
  if (totalScore >= 70) return "C-";
  if (totalScore >= 60) return "D";
  return "F";
}

export function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-600 dark:text-emerald-400";
  if (grade.startsWith("B")) return "text-green-600 dark:text-green-400";
  if (grade.startsWith("C")) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
