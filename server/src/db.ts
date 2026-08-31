import Database from "better-sqlite3";
import path from "path";
import { masterAccount } from "./masterAccount";

const dbPath = path.join(__dirname, "..", "school.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER NOT NULL,
    module TEXT NOT NULL,
    PRIMARY KEY (user_id, module),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (stage_id) REFERENCES stages(id)
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_label TEXT NOT NULL,
    level_label TEXT NOT NULL,
    class_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    level_id INTEGER,
    FOREIGN KEY (level_id) REFERENCES levels(id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seq_no INTEGER NOT NULL,
    gender TEXT NOT NULL,
    name TEXT NOT NULL,
    tel1 TEXT,
    tel2 TEXT,
    national_id TEXT,
    moe_code TEXT,
    address TEXT,
    birthday TEXT,
    division TEXT,
    section TEXT,
    category TEXT,
    class_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    UNIQUE(student_id, date)
  );

  CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    desired_class_id INTEGER,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (desired_class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS fee_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    default_amount REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS timetable_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    period_no INTEGER NOT NULL,
    start_time TEXT,
    end_time TEXT,
    subject TEXT NOT NULL,
    teacher_name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    UNIQUE(class_id, day_of_week, period_no)
  );

  CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_name TEXT NOT NULL,
    plate_number TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    capacity INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bus_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    pickup_point TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bus_id) REFERENCES buses(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE(bus_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT,
    location TEXT,
    condition TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT,
    department TEXT,
    phone TEXT,
    email TEXT,
    national_id TEXT,
    hire_date TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    fee_type_id INTEGER,
    amount REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'cash',
    paid_on TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (fee_type_id) REFERENCES fee_types(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    module TEXT,
    status_code INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Keyed by username (not a numeric user id) so the master account — which has no row in
  -- the users table — can be tracked the same way as everyone else.
  CREATE TABLE IF NOT EXISTS user_presence (
    username TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'offline',
    login_at TEXT,
    last_heartbeat_at TEXT,
    last_active_at TEXT,
    idle_since TEXT,
    total_idle_seconds INTEGER NOT NULL DEFAULT 0,
    offline_at TEXT
  );

  -- HR & Staff module. Scoped by school_id (unlike students/finance/etc., which stay
  -- single-school) — see docs/claude.md for why the scoping boundary stops here.
  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    governorate TEXT,
    directorate TEXT,
    logo_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Backs the Configuration ribbon's "Payroll Setup" catalogs (Allowance, Over Time,
  -- Rewards, Misconduct, Benefits, Tax, Deductions — a name + numeric amount/percentage)
  -- plus "leave_type" (amount = annual entitlement days, backs "Leves Balance").
  -- school_id NULL = shared across all schools; non-null = specific to one school.
  CREATE TABLE IF NOT EXISTS hr_valued_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    school_id INTEGER,
    name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    is_percentage INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (school_id) REFERENCES schools(id)
  );

  -- Backs the Configuration ribbon's "Basic Data" catalogs (Country, Area, Banks,
  -- Universities, Educations, Position, Division, Section, Department — pure name lists)
  -- plus the per-school "Outside Employees" and "Message" (body text goes in "note").
  CREATE TABLE IF NOT EXISTS hr_lookup_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    school_id INTEGER,
    name TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS hr_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    FOREIGN KEY (school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS hr_official_holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS hr_employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    address TEXT,
    country TEXT,
    area TEXT,
    tel1 TEXT,
    tel2 TEXT,
    registration_date TEXT,
    birthday TEXT,
    gender TEXT NOT NULL DEFAULT 'M',
    religion TEXT,
    nationality TEXT,
    reg_code TEXT,
    marital_status TEXT,
    email TEXT,
    handicap INTEGER NOT NULL DEFAULT 0,
    division TEXT,
    section TEXT,
    department TEXT,
    job TEXT,
    status TEXT,
    shift TEXT,
    contract_type TEXT,
    contract_from TEXT,
    contract_to TEXT,
    education TEXT,
    university TEXT,
    id_number TEXT,
    salary_method TEXT NOT NULL DEFAULT 'cash',
    medical_check TEXT,
    bank1_name TEXT,
    bank1_account TEXT,
    bank2_name TEXT,
    bank2_account TEXT,
    union_name TEXT,
    union_date TEXT,
    insurance_number TEXT,
    insured INTEGER NOT NULL DEFAULT 0,
    form1_date TEXT,
    insured_with_another INTEGER NOT NULL DEFAULT 0,
    fellowship_box INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS hr_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    check_in TEXT,
    check_out TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE(employee_id, date)
  );

  CREATE TABLE IF NOT EXISTS hr_attendance_days_closed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    closed_by TEXT,
    closed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE(school_id, date)
  );

  -- The ledger IS the balance: current balance for (employee, leave_type) = SUM(count).
  -- kind='opening_balance' rows carry no leave_start/leave_end; kind='leave' rows are an
  -- actual leave request (negative count, dates filled) and print the official leave form.
  CREATE TABLE IF NOT EXISTS hr_leave_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    entry_date TEXT NOT NULL,
    leave_type_id INTEGER NOT NULL,
    leave_start TEXT,
    leave_end TEXT,
    count REAL NOT NULL,
    kind TEXT NOT NULL DEFAULT 'leave',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (leave_type_id) REFERENCES hr_valued_items(id)
  );

  -- Employee org hierarchy (Division > Section > Job), mirroring stages/levels/classes for
  -- students — a real, manageable structure (not a flat catalog), scoped per school.
  CREATE TABLE IF NOT EXISTS hr_org_divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS hr_org_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (division_id) REFERENCES hr_org_divisions(id)
  );

  CREATE TABLE IF NOT EXISTS hr_org_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (section_id) REFERENCES hr_org_sections(id)
  );

  -- Payroll: a standing or one-off per-employee amount, covering every Additional/
  -- Deduction/Tax button on the Payroll ribbon. Denormalized (label/amount/is_percentage
  -- copied at assignment time from the chosen hr_valued_items row, or hand-entered) so a
  -- later catalog-rate change never rewrites history.
  CREATE TABLE IF NOT EXISTS hr_employee_salary_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    is_percentage INTEGER NOT NULL DEFAULT 0,
    recurring INTEGER NOT NULL DEFAULT 1,
    one_off_month TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS hr_payroll_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE(school_id, month)
  );

  -- One row per employee per loaded period — a payslip snapshot, recomputed in place
  -- (not appended) each time Load Salary is re-run for that month.
  CREATE TABLE IF NOT EXISTS hr_payroll_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    basic_salary REAL NOT NULL,
    additions_total REAL NOT NULL,
    deductions_total REAL NOT NULL,
    leave_deduction REAL NOT NULL,
    tax_total REAL NOT NULL,
    net_salary REAL NOT NULL,
    generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES hr_payroll_periods(id),
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    UNIQUE(period_id, employee_id)
  );

  -- Generic name+note catalogs for the Student's Affair "Configuration" ribbon (Country,
  -- Nationality, Warnings, Course, Area, Second Lang, District, Education, Category, Expense
  -- Levels, Revenue Levels, Ministry) — single-school, unlike hr_lookup_items which is
  -- per-school, since only HR & Staff has multi-school support (see seedHrOrgTree above).
  CREATE TABLE IF NOT EXISTS config_lookup_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Curriculum subjects (Time Table > Subjects). weekly_periods is the "Section Count" /
  -- weekly-periods target shown as "Target" in the Classes's Time Table subject panel.
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT,
    ig_subject INTEGER NOT NULL DEFAULT 0,
    weekly_periods INTEGER NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    category TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subject_levels (
    subject_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    PRIMARY KEY (subject_id, level_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
  );

  -- The Classes's Time Table modal's period-of-day column headers (Time Table > Daily Period).
  CREATE TABLE IF NOT EXISTS daily_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_no INTEGER NOT NULL UNIQUE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
  );

  -- "Time Table Post" — once posted, a class's timetable can no longer be edited (same
  -- closed/locked idea as hr_attendance_days_closed, applied per class instead of per date).
  CREATE TABLE IF NOT EXISTS class_timetable_status (
    class_id INTEGER PRIMARY KEY,
    posted INTEGER NOT NULL DEFAULT 0,
    posted_at TEXT,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  );

  -- Whether an HR employee (division = المدرسين) currently participates in timetable
  -- scheduling — decoupled from their HR employment status so the Time Table > Teachers tile
  -- can toggle/remove it without ever touching the HR employee record itself.
  CREATE TABLE IF NOT EXISTS timetable_teacher_overrides (
    employee_id INTEGER PRIMARY KEY,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
  );
`);

const STUDENT_COLUMNS: [string, string][] = [
  ["name_en", "TEXT"],
  ["country", "TEXT"],
  ["area", "TEXT"],
  ["district", "TEXT"],
  ["admission_date", "TEXT"],
  ["student_no", "TEXT"],
  ["religion", "TEXT"],
  ["nationality", "TEXT"],
  ["count_value", "TEXT"],
  ["status", "TEXT"],
  ["status_date", "TEXT"],
  ["father_name", "TEXT"],
  ["father_national_id", "TEXT"],
  ["father_mobile", "TEXT"],
  ["father_job", "TEXT"],
  ["father_education", "TEXT"],
  ["father_company", "TEXT"],
  ["father_email", "TEXT"],
  ["mother_name", "TEXT"],
  ["mother_national_id", "TEXT"],
  ["mother_mobile", "TEXT"],
  ["mother_job", "TEXT"],
  ["mother_education", "TEXT"],
  ["mother_company", "TEXT"],
  ["mother_email", "TEXT"],
  ["notes", "TEXT"],
  ["medical_condition", "TEXT"],
  ["education_authority", "TEXT"],
  ["special_case", "INTEGER NOT NULL DEFAULT 0"],
  ["integrated", "INTEGER NOT NULL DEFAULT 0"],
  ["uses_bus", "INTEGER NOT NULL DEFAULT 0"],
  ["emergency_name", "TEXT"],
  ["emergency_tel", "TEXT"],
  ["photo_url", "TEXT"],
  ["transferred_from", "TEXT"],
  ["transferred_in", "TEXT"],
];

function migrateStudentsColumns() {
  const existing = (db.prepare("PRAGMA table_info(students)").all() as { name: string }[]).map((c) => c.name);
  for (const [name, type] of STUDENT_COLUMNS) {
    if (!existing.includes(name)) {
      db.exec(`ALTER TABLE students ADD COLUMN ${name} ${type}`);
    }
  }
}

const HR_EMPLOYEE_COLUMNS: [string, string][] = [
  ["insured_pension", "INTEGER NOT NULL DEFAULT 0"],
  ["basic_salary", "REAL NOT NULL DEFAULT 0"],
];

function migrateHrEmployeesColumns() {
  const existing = (db.prepare("PRAGMA table_info(hr_employees)").all() as { name: string }[]).map((c) => c.name);
  for (const [name, type] of HR_EMPLOYEE_COLUMNS) {
    if (!existing.includes(name)) {
      db.exec(`ALTER TABLE hr_employees ADD COLUMN ${name} ${type}`);
    }
  }
}

function migrateClassHierarchy() {
  const classColumns = (db.prepare("PRAGMA table_info(classes)").all() as { name: string }[]).map((c) => c.name);
  if (!classColumns.includes("level_id")) {
    db.exec("ALTER TABLE classes ADD COLUMN level_id INTEGER");
  }

  const stageCount = (db.prepare("SELECT COUNT(*) as c FROM stages").get() as { c: number }).c;
  if (stageCount > 0) return;

  const classes = db
    .prepare("SELECT * FROM classes WHERE level_id IS NULL ORDER BY sort_order")
    .all() as any[];
  if (classes.length === 0) return;

  const insertStage = db.prepare("INSERT INTO stages (name, sort_order) VALUES (?, ?)");
  const insertLevel = db.prepare("INSERT INTO levels (stage_id, name, sort_order) VALUES (?, ?, ?)");
  const setLevelId = db.prepare("UPDATE classes SET level_id = ? WHERE id = ?");

  const stageIds = new Map<string, number>();
  const levelIds = new Map<string, number>();
  let stageOrder = 0;
  let levelOrder = 0;

  for (const cls of classes) {
    if (!stageIds.has(cls.stage_label)) {
      const info = insertStage.run(cls.stage_label, stageOrder++);
      stageIds.set(cls.stage_label, Number(info.lastInsertRowid));
      levelOrder = 0;
    }
    const levelKey = `${cls.stage_label}::${cls.level_label}`;
    if (!levelIds.has(levelKey)) {
      const info = insertLevel.run(stageIds.get(cls.stage_label), cls.level_label, levelOrder++);
      levelIds.set(levelKey, Number(info.lastInsertRowid));
    }
    setLevelId.run(levelIds.get(levelKey), cls.id);
  }
}

type ClassSeed = { stage: string; level: string; sections: string[] };

const CLASS_TREE: ClassSeed[] = [
  { stage: "رياض اطفال", level: "Kg1", sections: ["KG1 - A", "KG1 - B", "KG1 - C"] },
  { stage: "رياض اطفال", level: "Kg2", sections: ["KG2 - A", "KG2 - B", "KG2 - C"] },
  { stage: "المرحلة الابتدائية", level: "أولى ابتدائى", sections: ["١/١ أ", "١/١ ب", "١/١ ج"] },
  { stage: "المرحلة الابتدائية", level: "ثانية ابتدائى", sections: ["٢/١ أ", "٢/١ ب", "٢/١ ج"] },
  { stage: "المرحلة الابتدائية", level: "ثالثة ابتدائى", sections: ["٣/١ أ", "٣/١ ب", "٣/١ ج"] },
  { stage: "المرحلة الابتدائية", level: "رابعة ابتدائى", sections: ["٤/١ أ", "٤/١ ب", "٤/١ ج"] },
  { stage: "المرحلة الابتدائية", level: "خامسة ابتدائى", sections: ["٥/١ أ", "٥/١ ب", "٥/١ ج"] },
  { stage: "المرحلة الابتدائية", level: "سادسة ابتدائى", sections: ["٦/١ أ", "٦/١ ب", "٦/١ ج"] },
];

function seedClasses() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM classes").get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(
    "INSERT INTO classes (stage_label, level_label, class_name, sort_order) VALUES (?, ?, ?, ?)"
  );
  let order = 0;
  for (const group of CLASS_TREE) {
    for (const section of group.sections) {
      insert.run(group.stage, group.level, section, order++);
    }
  }
}

// Fabricated sample data for demo purposes only — not sourced from any real school records.
const FIRST_NAMES_M = ["Ahmed", "Mohamed", "Youssef", "Omar", "Ali", "Karim", "Hassan", "Mostafa", "Ziad", "Adam"];
const FIRST_NAMES_F = ["Sara", "Mariam", "Nour", "Lara", "Jana", "Habiba", "Lina", "Farida", "Malak", "Salma"];
const FATHER_NAMES = ["Mahmoud", "Ibrahim", "Khaled", "Tarek", "Sameh", "Hany", "Wael", "Sherif", "Adel", "Ashraf"];
const FAMILY_NAMES = ["Abdelrahman", "El-Sayed", "Hassan", "Fahmy", "Nasser", "Salem", "Kandil", "Zaki", "Mansour", "Rady"];
const CATEGORIES = ["خارجى", "هيئة"];
const ADDRESSES = [
  "Sample District, Building 12",
  "Green Valley Compound, Block 4",
  "Al Nour Street, Apt 5",
  "Palm Hills, Villa 21",
  "Nasr City, 9th Zone",
  "Al Salam Avenue, Floor 3",
];

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

function fakePhone(seed: number) {
  return `010${pad((seed * 7919) % 100000000, 8)}`;
}

function fakeBirthday(levelIndex: number, i: number) {
  const baseYear = 2023 - levelIndex; // KG1 ~ youngest, grade 6 ~ oldest
  const month = ((i * 3) % 12) + 1;
  const day = ((i * 5) % 27) + 1;
  return `${baseYear}-${pad(month)}-${pad(day)}`;
}

function seedStudents() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM students").get() as { c: number }).c;
  if (count > 0) return;

  const classes = db.prepare("SELECT * FROM classes ORDER BY sort_order").all() as any[];
  const insert = db.prepare(`
    INSERT INTO students
      (seq_no, gender, name, tel1, tel2, national_id, moe_code, address, birthday, division, section, category, class_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let seq = 1;
  let levelIndex = 0;
  let lastLevel = "";

  for (const cls of classes) {
    if (cls.level_label !== lastLevel) {
      levelIndex++;
      lastLevel = cls.level_label;
    }
    const studentsPerClass = 6;
    for (let i = 0; i < studentsPerClass; i++) {
      const isMale = i % 2 === 0;
      const first = isMale
        ? FIRST_NAMES_M[i % FIRST_NAMES_M.length]
        : FIRST_NAMES_F[i % FIRST_NAMES_F.length];
      const father = FATHER_NAMES[(i + levelIndex) % FATHER_NAMES.length];
      const family = FAMILY_NAMES[(i + levelIndex * 3) % FAMILY_NAMES.length];
      const name = `${first} ${father} ${family}`;
      const genderLabel = isMale ? "M" : "F";
      const nationalId = `2${pad(15 + levelIndex, 2)}${pad(((seq + i) % 12) + 1)}${pad(((seq + i) % 27) + 1)}00${pad((seq + i) % 1000, 4)}`;

      insert.run(
        seq,
        genderLabel,
        name,
        fakePhone(seq),
        fakePhone(seq + 500),
        nationalId,
        `MOE-${100000 + seq}`,
        ADDRESSES[(seq + i) % ADDRESSES.length],
        fakeBirthday(levelIndex, i),
        cls.stage_label,
        cls.level_label,
        CATEGORIES[(seq + i) % CATEGORIES.length],
        cls.id
      );
      seq++;
    }
  }
}

const FEE_TYPES: { name: string; amount: number }[] = [
  { name: "Tuition", amount: 8000 },
  { name: "Bus Fee", amount: 1500 },
  { name: "Uniform", amount: 600 },
  { name: "Books", amount: 900 },
  { name: "Activities", amount: 400 },
];

function seedFeeTypes() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM fee_types").get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare("INSERT INTO fee_types (name, default_amount) VALUES (?, ?)");
  for (const ft of FEE_TYPES) insert.run(ft.name, ft.amount);
}

const DEFAULT_SETTINGS: Record<string, string> = {
  school_name: "SchoolSuite Demo Academy",
  school_address: "1 Al Nour Street, Cairo, Egypt",
  school_phone: "02 1234 5678",
  academic_year: "2026 / 2027",
  license_to: "SchoolSuite Demo Academy",
  currency: "EGP",
};

function seedSettings() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM settings").get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, value);
}

// Seeds exactly one school from the existing single-school settings, so an existing
// install starts with one school and behaves identically to today until a second one is
// actually added.
function seedSchools() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM schools").get() as { c: number }).c;
  if (count > 0) return;

  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const info = db
    .prepare("INSERT INTO schools (name, address, phone) VALUES (?, ?, ?)")
    .run(settings.school_name ?? "My School", settings.school_address ?? null, settings.school_phone ?? null);

  seedHrOrgTree(Number(info.lastInsertRowid));
}

type OrgSeed = { division: string; sections: { section: string; job: string }[] };

const HR_ORG_TREE: OrgSeed[] = [
  { division: "مدير المدرسة", sections: [{ section: "مدير إدارة المدرسة", job: "مدير إدارة المدرسة" }] },
  {
    division: "الوكلاء",
    sections: [
      { section: "وكيل المرحلة الثانوى", job: "وكيل ثانوى" },
      { section: "وكيل المرحلة الاعدادى", job: "وكيل اعدادى" },
      { section: "وكيل المرحلة الابتدائى", job: "وكيل ابتدائى" },
      { section: "وكيل مرحلة رياض اطفال", job: "وكيل رياض اطفال" },
    ],
  },
  {
    division: "المدرسين",
    sections: [
      { section: "مادة التربية الدينية", job: "مدرس تربية دينية" },
      { section: "مادة الرياضيات", job: "مدرس رياضيات" },
      { section: "مادة العلوم", job: "مدرس علوم" },
      { section: "مادة اللغة العربية", job: "مدرس لغة عربية" },
      { section: "مادة اللغة الانجليزية", job: "مدرس لغة انجليزية" },
      { section: "مادة اللغة الفرنسية", job: "مدرس لغة فرنسية" },
      { section: "مادة احياء و جيولوجيا", job: "مدرس احياء و جيولوجيا" },
      { section: "مادة اقتصاد", job: "مدرس اقتصاد" },
      { section: "مادة تربية فنية", job: "مدرس تربية فنية" },
    ],
  },
];

// Seeds the reference school's default org structure (Division > Section > Job) for a
// newly-created school, so there's something sensible to start editing from — exported so
// server/src/routes/schools.ts can call it too when a new school is added.
export function seedHrOrgTree(schoolId: number) {
  const insertDivision = db.prepare("INSERT INTO hr_org_divisions (school_id, name, sort_order) VALUES (?, ?, ?)");
  const insertSection = db.prepare("INSERT INTO hr_org_sections (division_id, name, sort_order) VALUES (?, ?, ?)");
  const insertJob = db.prepare("INSERT INTO hr_org_jobs (section_id, name, sort_order) VALUES (?, ?, ?)");

  HR_ORG_TREE.forEach((divisionSeed, divisionOrder) => {
    const divisionInfo = insertDivision.run(schoolId, divisionSeed.division, divisionOrder);
    const divisionId = Number(divisionInfo.lastInsertRowid);
    divisionSeed.sections.forEach((sectionSeed, sectionOrder) => {
      const sectionInfo = insertSection.run(divisionId, sectionSeed.section, sectionOrder);
      insertJob.run(Number(sectionInfo.lastInsertRowid), sectionSeed.job, 0);
    });
  });
}

migrateStudentsColumns();
migrateHrEmployeesColumns();

seedClasses();
migrateClassHierarchy();
seedStudents();
seedFeeTypes();
seedSettings();
seedSchools();

// Backfills the default org tree for any school that predates this feature (created before
// seedHrOrgTree existed) — a fresh school always gets one via seedSchools()/POST /schools,
// this only catches schools that already existed.
for (const school of db.prepare("SELECT id FROM schools").all() as { id: number }[]) {
  const hasOrgTree = (
    db.prepare("SELECT COUNT(*) as c FROM hr_org_divisions WHERE school_id = ?").get(school.id) as { c: number }
  ).c;
  if (!hasOrgTree) seedHrOrgTree(school.id);
}

// The master account is excluded from the audit log going forward (see activityLog.ts's
// recordActivity), but that doesn't retroactively clean up rows written before this was
// added — do that once here so upgrading a running deployment clears them out too.
db.prepare("DELETE FROM activity_log WHERE username = ? OR role = 'master'").run(masterAccount.username);
