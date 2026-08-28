import Database from "better-sqlite3";
import path from "path";

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
];

function migrateStudentsColumns() {
  const existing = (db.prepare("PRAGMA table_info(students)").all() as { name: string }[]).map((c) => c.name);
  for (const [name, type] of STUDENT_COLUMNS) {
    if (!existing.includes(name)) {
      db.exec(`ALTER TABLE students ADD COLUMN ${name} ${type}`);
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

migrateStudentsColumns();

seedClasses();
migrateClassHierarchy();
seedStudents();
seedFeeTypes();
seedSettings();
