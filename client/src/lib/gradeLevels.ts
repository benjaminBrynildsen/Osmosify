export const GRADE_LEVELS = [
  { value: "preschool", label: "Preschool" },
  { value: "pre-k", label: "Pre-K" },
  { value: "kindergarten", label: "Kindergarten" },
  { value: "1st", label: "1st Grade" },
  { value: "2nd", label: "2nd Grade" },
  { value: "3rd", label: "3rd Grade" },
  { value: "4th", label: "4th Grade" },
  { value: "5th", label: "5th Grade" },
  { value: "6th", label: "6th Grade" },
  { value: "7th", label: "7th Grade" },
  { value: "8th", label: "8th Grade" },
  { value: "9th", label: "9th Grade" },
  { value: "10th", label: "10th Grade" },
  { value: "11th", label: "11th Grade" },
  { value: "12th", label: "12th Grade" },
];

export function getGradeLevelLabel(value: string | null | undefined): string {
  if (!value) return "";
  const grade = GRADE_LEVELS.find((g) => g.value === value);
  return grade?.label || value;
}
