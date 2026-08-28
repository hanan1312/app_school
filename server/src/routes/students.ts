import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireModule } from "../permissions";

export const studentsRouter = Router();
studentsRouter.use(requireModule("students"));

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
      cb(null, `student-${req.params.id}-${Date.now()}${ext}`);
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

studentsRouter.get("/", requireAuth, (req, res) => {
  const { classId, classIds, q } = req.query as { classId?: string; classIds?: string; q?: string };

  let sql = "SELECT * FROM students WHERE 1=1";
  const params: any[] = [];

  if (classIds) {
    const ids = classIds
      .split(",")
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n));
    sql += ids.length > 0 ? ` AND class_id IN (${ids.map(() => "?").join(",")})` : " AND 0=1";
    params.push(...ids);
  } else if (classId) {
    sql += " AND class_id = ?";
    params.push(Number(classId));
  }
  if (q) {
    sql += " AND (name LIKE ? OR name_en LIKE ? OR tel1 LIKE ? OR national_id LIKE ? OR moe_code LIKE ? OR student_no LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  sql += " ORDER BY seq_no ASC";

  const rows = db.prepare(sql).all(...params);
  res.json({ students: rows, count: rows.length });
});

function boolToInt(v: unknown) {
  return v ? 1 : 0;
}

studentsRouter.post("/", requireAuth, (req, res) => {
  const b = req.body ?? {};
  if (!b.name || !b.gender) {
    return res.status(400).json({ error: "Name and gender are required" });
  }

  const maxSeq = (db.prepare("SELECT MAX(seq_no) as m FROM students").get() as { m: number | null }).m ?? 0;

  const info = db
    .prepare(
      `INSERT INTO students
        (seq_no, gender, name, name_en, tel1, tel2, national_id, moe_code, address, birthday, division, section,
         category, class_id, country, area, district, admission_date, student_no, religion, nationality, count_value,
         status, status_date, father_name, father_national_id, father_mobile, father_job, father_education,
         father_company, father_email, mother_name, mother_national_id, mother_mobile, mother_job, mother_education,
         mother_company, mother_email, notes, medical_condition, education_authority, special_case, integrated,
         uses_bus, emergency_name, emergency_tel, transferred_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      maxSeq + 1,
      b.gender,
      b.name,
      b.nameEn ?? null,
      b.tel1 ?? null,
      b.tel2 ?? null,
      b.nationalId ?? null,
      b.moeCode ?? null,
      b.address ?? null,
      b.birthday ?? null,
      b.division ?? null,
      b.section ?? null,
      b.category ?? null,
      b.classId ?? null,
      b.country ?? null,
      b.area ?? null,
      b.district ?? null,
      b.admissionDate ?? null,
      b.studentNo ?? null,
      b.religion ?? null,
      b.nationality ?? null,
      b.countValue ?? null,
      b.status ?? null,
      b.statusDate ?? null,
      b.fatherName ?? null,
      b.fatherNationalId ?? null,
      b.fatherMobile ?? null,
      b.fatherJob ?? null,
      b.fatherEducation ?? null,
      b.fatherCompany ?? null,
      b.fatherEmail ?? null,
      b.motherName ?? null,
      b.motherNationalId ?? null,
      b.motherMobile ?? null,
      b.motherJob ?? null,
      b.motherEducation ?? null,
      b.motherCompany ?? null,
      b.motherEmail ?? null,
      b.notes ?? null,
      b.medicalCondition ?? null,
      b.educationAuthority ?? null,
      boolToInt(b.specialCase),
      boolToInt(b.integrated),
      boolToInt(b.usesBus),
      b.emergencyName ?? null,
      b.emergencyTel ?? null,
      b.transferredFrom ?? null
    );

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ student });
});

studentsRouter.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM students WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Student not found" });

  const b = req.body ?? {};
  db.prepare(
    `UPDATE students SET
      gender = ?, name = ?, name_en = ?, tel1 = ?, tel2 = ?, national_id = ?, moe_code = ?,
      address = ?, birthday = ?, division = ?, section = ?, category = ?, class_id = ?,
      country = ?, area = ?, district = ?, admission_date = ?, student_no = ?, religion = ?,
      nationality = ?, count_value = ?, status = ?, status_date = ?, father_name = ?,
      father_national_id = ?, father_mobile = ?, father_job = ?, father_education = ?,
      father_company = ?, father_email = ?, mother_name = ?, mother_national_id = ?,
      mother_mobile = ?, mother_job = ?, mother_education = ?, mother_company = ?, mother_email = ?,
      notes = ?, medical_condition = ?, education_authority = ?, special_case = ?, integrated = ?,
      uses_bus = ?, emergency_name = ?, emergency_tel = ?, transferred_from = ?
     WHERE id = ?`
  ).run(
    b.gender ?? existing.gender,
    b.name ?? existing.name,
    b.nameEn ?? existing.name_en,
    b.tel1 ?? existing.tel1,
    b.tel2 ?? existing.tel2,
    b.nationalId ?? existing.national_id,
    b.moeCode ?? existing.moe_code,
    b.address ?? existing.address,
    b.birthday ?? existing.birthday,
    b.division ?? existing.division,
    b.section ?? existing.section,
    b.category ?? existing.category,
    b.classId ?? existing.class_id,
    b.country ?? existing.country,
    b.area ?? existing.area,
    b.district ?? existing.district,
    b.admissionDate ?? existing.admission_date,
    b.studentNo ?? existing.student_no,
    b.religion ?? existing.religion,
    b.nationality ?? existing.nationality,
    b.countValue ?? existing.count_value,
    b.status ?? existing.status,
    b.statusDate ?? existing.status_date,
    b.fatherName ?? existing.father_name,
    b.fatherNationalId ?? existing.father_national_id,
    b.fatherMobile ?? existing.father_mobile,
    b.fatherJob ?? existing.father_job,
    b.fatherEducation ?? existing.father_education,
    b.fatherCompany ?? existing.father_company,
    b.fatherEmail ?? existing.father_email,
    b.motherName ?? existing.mother_name,
    b.motherNationalId ?? existing.mother_national_id,
    b.motherMobile ?? existing.mother_mobile,
    b.motherJob ?? existing.mother_job,
    b.motherEducation ?? existing.mother_education,
    b.motherCompany ?? existing.mother_company,
    b.motherEmail ?? existing.mother_email,
    b.notes ?? existing.notes,
    b.medicalCondition ?? existing.medical_condition,
    b.educationAuthority ?? existing.education_authority,
    b.specialCase === undefined ? existing.special_case : boolToInt(b.specialCase),
    b.integrated === undefined ? existing.integrated : boolToInt(b.integrated),
    b.usesBus === undefined ? existing.uses_bus : boolToInt(b.usesBus),
    b.emergencyName ?? existing.emergency_name,
    b.emergencyTel ?? existing.emergency_tel,
    b.transferredFrom ?? existing.transferred_from,
    id
  );

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
  res.json({ student });
});

studentsRouter.delete("/", requireAuth, (req, res) => {
  const ids = Array.isArray((req.body ?? {}).ids)
    ? (req.body.ids as unknown[]).map((v) => Number(v)).filter((n) => Number.isInteger(n))
    : [];
  if (ids.length === 0) return res.status(400).json({ error: "No student ids provided" });

  const placeholders = ids.map(() => "?").join(",");
  const existing = db.prepare(`SELECT photo_url FROM students WHERE id IN (${placeholders})`).all(...ids) as {
    photo_url: string | null;
  }[];
  const info = db.prepare(`DELETE FROM students WHERE id IN (${placeholders})`).run(...ids);
  existing.forEach((row) => deleteLocalUpload(row.photo_url));
  res.json({ ok: true, deleted: info.changes });
});

studentsRouter.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT photo_url FROM students WHERE id = ?").get(id) as
    | { photo_url: string | null }
    | undefined;
  const info = db.prepare("DELETE FROM students WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Student not found" });
  deleteLocalUpload(existing?.photo_url);
  res.status(204).send();
});

studentsRouter.post("/:id/photo", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM students WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Student not found" });

  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message ?? "Upload failed" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    deleteLocalUpload(existing.photo_url);
    const url = `/uploads/${req.file.filename}`;
    db.prepare("UPDATE students SET photo_url = ? WHERE id = ?").run(url, id);

    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
    res.status(201).json({ student });
  });
});

studentsRouter.delete("/:id/photo", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM students WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Student not found" });

  deleteLocalUpload(existing.photo_url);
  db.prepare("UPDATE students SET photo_url = NULL WHERE id = ?").run(id);

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
  res.json({ student });
});
