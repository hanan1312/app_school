// Server-side mirror of client/src/lib/hrEmployeeTitle.ts — kept in sync manually since the two
// run in separate builds. Used by hrOrg.ts to recompute an employee's derived Title when a
// Division rename changes what that formula would produce, so renaming in the org tree doesn't
// leave stale Titles behind until someone happens to re-open and re-save each employee.

const TEACHER_DIVISION_NAMES = new Set(["المدرسين", "teachers"]);
export function isTeacherDivisionName(division: string): boolean {
  return TEACHER_DIVISION_NAMES.has(division.trim().toLowerCase());
}

const HEADMASTER_DIVISION_NAMES = new Set(["مدير المدرسة", "headmaster"]);
export function isHeadmasterDivisionName(division: string): boolean {
  return HEADMASTER_DIVISION_NAMES.has(division.trim().toLowerCase());
}

const ARABIC_TEXT_RE = /[؀-ۿ]/;

export function deriveEmployeeTitle(division: string, sectionOrSubjectName: string, department: string): string {
  const trimmedDivision = division.trim();
  if (!trimmedDivision) return "";
  if (isHeadmasterDivisionName(trimmedDivision)) return "Headmaster";
  if (isTeacherDivisionName(trimmedDivision)) {
    const subject = (sectionOrSubjectName ?? "").trim();
    if (!subject) return "";
    return ARABIC_TEXT_RE.test(subject) ? `مدرس ${subject}` : `${subject} Teacher`;
  }
  return [trimmedDivision, (department ?? "").trim()].filter(Boolean).join(" ");
}
