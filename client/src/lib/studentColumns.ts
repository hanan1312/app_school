import type { Student } from "./types";

export type StudentColumnKey =
  | "gender"
  | "name"
  | "name_en"
  | "tel1"
  | "tel2"
  | "national_id"
  | "moe_code"
  | "address"
  | "birthday"
  | "division"
  | "section"
  | "category"
  | "country"
  | "area"
  | "district"
  | "admission_date"
  | "student_no"
  | "religion"
  | "nationality"
  | "count_value"
  | "status"
  | "status_date"
  | "father_name"
  | "father_national_id"
  | "father_mobile"
  | "father_job"
  | "father_education"
  | "father_company"
  | "father_email"
  | "mother_name"
  | "mother_national_id"
  | "mother_mobile"
  | "mother_job"
  | "mother_education"
  | "mother_company"
  | "mother_email"
  | "notes"
  | "medical_condition"
  | "education_authority"
  | "emergency_name"
  | "emergency_tel"
  | "special_case"
  | "integrated"
  | "uses_bus"
  | "transferred_from"
  | "transferred_in";

export type StudentColumnDef = {
  key: StudentColumnKey;
  label: string;
  defaultVisible: boolean;
  get: (s: Student) => string;
};

export function formatMoeCode(value: string | null): string {
  if (!value) return "";
  return value.replace(/^MOE-?/i, "");
}

export function genderLabel(gender: string | null | undefined): string {
  if (gender === "M") return "Male";
  if (gender === "F") return "Female";
  return "Unknown";
}

export function genderBadgeClass(gender: string | null | undefined): string {
  if (gender === "M") return "bg-brand-50 text-brand-700";
  if (gender === "F") return "bg-pink-50 text-pink-600";
  return "bg-slate-100 text-slate-500";
}

export const STUDENT_COLUMNS: StudentColumnDef[] = [
  { key: "gender", label: "Gender", defaultVisible: true, get: (s) => genderLabel(s.gender) },
  { key: "name", label: "Name", defaultVisible: true, get: (s) => s.name },
  { key: "name_en", label: "Name (En)", defaultVisible: false, get: (s) => s.name_en ?? "" },
  { key: "tel1", label: "Tel-1", defaultVisible: true, get: (s) => s.tel1 ?? "" },
  { key: "tel2", label: "Tel-2", defaultVisible: false, get: (s) => s.tel2 ?? "" },
  { key: "national_id", label: "ID", defaultVisible: true, get: (s) => s.national_id ?? "" },
  { key: "moe_code", label: "MOE Code", defaultVisible: true, get: (s) => formatMoeCode(s.moe_code) },
  { key: "address", label: "Address", defaultVisible: true, get: (s) => s.address ?? "" },
  { key: "birthday", label: "Birthday", defaultVisible: true, get: (s) => s.birthday ?? "" },
  { key: "division", label: "Division", defaultVisible: true, get: (s) => s.division ?? "" },
  { key: "section", label: "Section", defaultVisible: true, get: (s) => s.section ?? "" },
  { key: "category", label: "Category", defaultVisible: true, get: (s) => s.category ?? "" },
  { key: "country", label: "Country", defaultVisible: false, get: (s) => s.country ?? "" },
  { key: "area", label: "Area", defaultVisible: false, get: (s) => s.area ?? "" },
  { key: "district", label: "District", defaultVisible: false, get: (s) => s.district ?? "" },
  { key: "admission_date", label: "Admission Date", defaultVisible: false, get: (s) => s.admission_date ?? "" },
  { key: "student_no", label: "Student No.", defaultVisible: false, get: (s) => s.student_no ?? "" },
  { key: "religion", label: "Religion", defaultVisible: false, get: (s) => s.religion ?? "" },
  { key: "nationality", label: "Nationality", defaultVisible: false, get: (s) => s.nationality ?? "" },
  { key: "count_value", label: "Count", defaultVisible: false, get: (s) => s.count_value ?? "" },
  { key: "status", label: "Status", defaultVisible: false, get: (s) => s.status ?? "" },
  { key: "status_date", label: "Status Date", defaultVisible: false, get: (s) => s.status_date ?? "" },
  { key: "father_name", label: "Father Name", defaultVisible: false, get: (s) => s.father_name ?? "" },
  { key: "father_national_id", label: "Father National ID", defaultVisible: false, get: (s) => s.father_national_id ?? "" },
  { key: "father_mobile", label: "Father Mobile", defaultVisible: false, get: (s) => s.father_mobile ?? "" },
  { key: "father_job", label: "Father Job", defaultVisible: false, get: (s) => s.father_job ?? "" },
  { key: "father_education", label: "Father Education", defaultVisible: false, get: (s) => s.father_education ?? "" },
  { key: "father_company", label: "Father Company", defaultVisible: false, get: (s) => s.father_company ?? "" },
  { key: "father_email", label: "Father Email", defaultVisible: false, get: (s) => s.father_email ?? "" },
  { key: "mother_name", label: "Mother Name", defaultVisible: false, get: (s) => s.mother_name ?? "" },
  { key: "mother_national_id", label: "Mother National ID", defaultVisible: false, get: (s) => s.mother_national_id ?? "" },
  { key: "mother_mobile", label: "Mother Mobile", defaultVisible: false, get: (s) => s.mother_mobile ?? "" },
  { key: "mother_job", label: "Mother Job", defaultVisible: false, get: (s) => s.mother_job ?? "" },
  { key: "mother_education", label: "Mother Education", defaultVisible: false, get: (s) => s.mother_education ?? "" },
  { key: "mother_company", label: "Mother Company", defaultVisible: false, get: (s) => s.mother_company ?? "" },
  { key: "mother_email", label: "Mother Email", defaultVisible: false, get: (s) => s.mother_email ?? "" },
  { key: "emergency_name", label: "Emergency Name", defaultVisible: false, get: (s) => s.emergency_name ?? "" },
  { key: "emergency_tel", label: "Emergency Tel", defaultVisible: false, get: (s) => s.emergency_tel ?? "" },
  { key: "notes", label: "Notes", defaultVisible: false, get: (s) => s.notes ?? "" },
  { key: "medical_condition", label: "Medical Condition", defaultVisible: false, get: (s) => s.medical_condition ?? "" },
  { key: "education_authority", label: "Education Authority", defaultVisible: false, get: (s) => s.education_authority ?? "" },
  { key: "special_case", label: "Special Case", defaultVisible: false, get: (s) => (s.special_case ? "Yes" : "No") },
  { key: "integrated", label: "Integrated", defaultVisible: false, get: (s) => (s.integrated ? "Yes" : "No") },
  { key: "uses_bus", label: "Uses School Bus", defaultVisible: false, get: (s) => (s.uses_bus ? "Yes" : "No") },
  { key: "transferred_from", label: "Transfere Out", defaultVisible: false, get: (s) => s.transferred_from ?? "" },
  { key: "transferred_in", label: "Transfere In", defaultVisible: false, get: (s) => s.transferred_in ?? "" },
];

export const DEFAULT_VISIBLE_COLUMNS: StudentColumnKey[] = STUDENT_COLUMNS.filter((c) => c.defaultVisible).map(
  (c) => c.key
);

const STORAGE_KEY = "students-table-columns-v1";

export function loadVisibleColumns(): StudentColumnKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as string[];
    const known = new Set(STUDENT_COLUMNS.map((c) => c.key));
    const filtered = parsed.filter((k): k is StudentColumnKey => known.has(k as StudentColumnKey));
    return filtered.length > 0 ? filtered : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

export function saveVisibleColumns(keys: StudentColumnKey[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}
