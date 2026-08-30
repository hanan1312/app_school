import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireModule } from "../permissions";

export const hrEmployeesRouter = Router();
hrEmployeesRouter.use(requireModule("hrEmployees"));

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED_MIME[file.mimetype] ?? path.extname(file.originalname) ?? "";
      cb(null, `hr-employee-${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      cb(new Error("Unsupported image type. Use PNG, JPEG or WEBP."));
      return;
    }
    cb(null, true);
  },
});

function deleteLocalUpload(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(url));
  fs.unlink(filePath, () => {});
}

const COLUMNS = [
  "school_id",
  "name_ar",
  "name_en",
  "address",
  "country",
  "area",
  "tel1",
  "tel2",
  "registration_date",
  "birthday",
  "gender",
  "religion",
  "nationality",
  "reg_code",
  "marital_status",
  "email",
  "handicap",
  "division",
  "section",
  "department",
  "job",
  "status",
  "shift",
  "contract_type",
  "contract_from",
  "contract_to",
  "education",
  "university",
  "id_number",
  "salary_method",
  "medical_check",
  "bank1_name",
  "bank1_account",
  "bank2_name",
  "bank2_account",
  "union_name",
  "union_date",
  "insurance_number",
  "insured",
  "form1_date",
  "insured_with_another",
  "fellowship_box",
] as const;

function fromBody(b: Record<string, unknown>) {
  return {
    school_id: Number(b.schoolId),
    name_ar: b.nameAr ?? null,
    name_en: b.nameEn ?? null,
    address: b.address ?? null,
    country: b.country ?? null,
    area: b.area ?? null,
    tel1: b.tel1 ?? null,
    tel2: b.tel2 ?? null,
    registration_date: b.registrationDate ?? null,
    birthday: b.birthday ?? null,
    gender: b.gender ?? "M",
    religion: b.religion ?? null,
    nationality: b.nationality ?? null,
    reg_code: b.regCode ?? null,
    marital_status: b.maritalStatus ?? null,
    email: b.email ?? null,
    handicap: b.handicap ? 1 : 0,
    division: b.division ?? null,
    section: b.section ?? null,
    department: b.department ?? null,
    job: b.job ?? null,
    status: b.status ?? null,
    shift: b.shift ?? null,
    contract_type: b.contractType ?? null,
    contract_from: b.contractFrom ?? null,
    contract_to: b.contractTo ?? null,
    education: b.education ?? null,
    university: b.university ?? null,
    id_number: b.idNumber ?? null,
    salary_method: b.salaryMethod ?? "cash",
    medical_check: b.medicalCheck ?? null,
    bank1_name: b.bank1Name ?? null,
    bank1_account: b.bank1Account ?? null,
    bank2_name: b.bank2Name ?? null,
    bank2_account: b.bank2Account ?? null,
    union_name: b.unionName ?? null,
    union_date: b.unionDate ?? null,
    insurance_number: b.insuranceNumber ?? null,
    insured: b.insured ? 1 : 0,
    form1_date: b.form1Date ?? null,
    insured_with_another: b.insuredWithAnother ? 1 : 0,
    fellowship_box: b.fellowshipBox ? 1 : 0,
  };
}

hrEmployeesRouter.get("/", requireAuth, (req, res) => {
  const { schoolId, q } = req.query as { schoolId?: string; q?: string };

  let sql = "SELECT * FROM hr_employees WHERE 1=1";
  const params: any[] = [];
  if (schoolId) {
    sql += " AND school_id = ?";
    params.push(Number(schoolId));
  }
  if (q) {
    sql += " AND (name_ar LIKE ? OR name_en LIKE ? OR id_number LIKE ? OR job LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  sql += " ORDER BY name_ar ASC";

  const rows = db.prepare(sql).all(...params);
  res.json({ employees: rows, count: rows.length });
});

hrEmployeesRouter.post("/", requireAuth, (req, res) => {
  const b = req.body ?? {};
  if (!b.nameAr) return res.status(400).json({ error: "Name (Ar) is required" });
  if (!b.schoolId) return res.status(400).json({ error: "School is required" });

  const values = fromBody(b);
  const info = db
    .prepare(
      `INSERT INTO hr_employees (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`
    )
    .run(...COLUMNS.map((c) => (values as any)[c]));

  const employee = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ employee });
});

hrEmployeesRouter.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Employee not found" });

  const b = req.body ?? {};
  const incoming = fromBody(b);
  const merged: Record<string, unknown> = {};
  for (const c of COLUMNS) merged[c] = b[toCamel(c)] !== undefined ? (incoming as any)[c] : existing[c];

  db.prepare(`UPDATE hr_employees SET ${COLUMNS.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`).run(
    ...COLUMNS.map((c) => merged[c]),
    id
  );

  const employee = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(id);
  res.json({ employee });
});

function toCamel(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

hrEmployeesRouter.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT photo_url FROM hr_employees WHERE id = ?").get(id) as
    | { photo_url: string | null }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Employee not found" });

  deleteLocalUpload(existing.photo_url);
  db.prepare("DELETE FROM hr_employees WHERE id = ?").run(id);
  res.status(204).send();
});

hrEmployeesRouter.post("/:id/photo", requireAuth, upload.single("file"), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT photo_url FROM hr_employees WHERE id = ?").get(id) as
    | { photo_url: string | null }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Employee not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  deleteLocalUpload(existing.photo_url);
  const url = `/uploads/${req.file.filename}`;
  db.prepare("UPDATE hr_employees SET photo_url = ? WHERE id = ?").run(url, id);

  const employee = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(id);
  res.json({ employee });
});

hrEmployeesRouter.delete("/:id/photo", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT photo_url FROM hr_employees WHERE id = ?").get(id) as
    | { photo_url: string | null }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Employee not found" });

  deleteLocalUpload(existing.photo_url);
  db.prepare("UPDATE hr_employees SET photo_url = NULL WHERE id = ?").run(id);

  const employee = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(id);
  res.json({ employee });
});
