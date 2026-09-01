import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireModule } from "../permissions";

export const timetableRouter = Router();
timetableRouter.use(requireModule("timetable"));

const DAY_COUNT = 5; // Sunday..Thursday, matching TimeTablePage's DAYS constant

function isClassPosted(classId: number): boolean {
  const row = db.prepare("SELECT posted FROM class_timetable_status WHERE class_id = ?").get(classId) as
    | { posted: number }
    | undefined;
  return Boolean(row?.posted);
}

function resolveSubjectName(subjectId: number | null | undefined): string | null {
  if (!subjectId) return null;
  const row = db.prepare("SELECT name FROM subjects WHERE id = ?").get(subjectId) as { name: string } | undefined;
  return row?.name ?? null;
}

function resolveTeacherName(teacherId: number | null | undefined): string | null {
  if (!teacherId) return null;
  const row = db.prepare("SELECT name_ar FROM hr_employees WHERE id = ?").get(teacherId) as
    | { name_ar: string }
    | undefined;
  return row?.name_ar ?? null;
}

timetableRouter.get("/", requireAuth, (req, res) => {
  const { classId } = req.query as { classId?: string };
  if (!classId) return res.status(400).json({ error: "classId is required" });

  const rows = db
    .prepare("SELECT * FROM timetable_entries WHERE class_id = ? ORDER BY day_of_week ASC, period_no ASC")
    .all(Number(classId));
  res.json({ entries: rows });
});

timetableRouter.post("/", requireAuth, (req, res) => {
  const b = req.body ?? {};
  const subjectName = b.subject ?? resolveSubjectName(b.subjectId);
  if (!b.classId || b.dayOfWeek == null || !b.periodNo || !subjectName) {
    return res.status(400).json({ error: "classId, dayOfWeek, periodNo and subject are required" });
  }
  if (isClassPosted(Number(b.classId))) {
    return res.status(409).json({ error: "This class's timetable has been posted and can no longer be edited" });
  }

  const existing = db
    .prepare("SELECT id FROM timetable_entries WHERE class_id = ? AND day_of_week = ? AND period_no = ?")
    .get(b.classId, b.dayOfWeek, b.periodNo);
  if (existing) {
    return res.status(409).json({ error: "This period is already scheduled for that day" });
  }

  const teacherName = b.teacherName ?? resolveTeacherName(b.teacherId);
  const info = db
    .prepare(
      `INSERT INTO timetable_entries
        (class_id, day_of_week, period_no, start_time, end_time, subject, teacher_name, subject_id, teacher_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.classId,
      b.dayOfWeek,
      b.periodNo,
      b.startTime ?? null,
      b.endTime ?? null,
      subjectName,
      teacherName ?? null,
      b.subjectId ?? null,
      b.teacherId ?? null
    );

  const entry = db.prepare("SELECT * FROM timetable_entries WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ entry });
});

timetableRouter.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM timetable_entries WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Entry not found" });
  if (isClassPosted(existing.class_id)) {
    return res.status(409).json({ error: "This class's timetable has been posted and can no longer be edited" });
  }

  const b = req.body ?? {};
  const subjectId = b.subjectId === undefined ? existing.subject_id : b.subjectId;
  const teacherId = b.teacherId === undefined ? existing.teacher_id : b.teacherId;
  db.prepare(
    `UPDATE timetable_entries SET
      day_of_week = ?, period_no = ?, start_time = ?, end_time = ?, subject = ?, teacher_name = ?,
      subject_id = ?, teacher_id = ?
     WHERE id = ?`
  ).run(
    b.dayOfWeek ?? existing.day_of_week,
    b.periodNo ?? existing.period_no,
    b.startTime ?? existing.start_time,
    b.endTime ?? existing.end_time,
    b.subject ?? resolveSubjectName(subjectId) ?? existing.subject,
    b.teacherName ?? resolveTeacherName(teacherId) ?? existing.teacher_name,
    subjectId ?? null,
    teacherId ?? null,
    id
  );

  const entry = db.prepare("SELECT * FROM timetable_entries WHERE id = ?").get(id);
  res.json({ entry });
});

timetableRouter.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT class_id FROM timetable_entries WHERE id = ?").get(id) as
    | { class_id: number }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Entry not found" });
  if (isClassPosted(existing.class_id)) {
    return res.status(409).json({ error: "This class's timetable has been posted and can no longer be edited" });
  }

  db.prepare("DELETE FROM timetable_entries WHERE id = ?").run(id);
  res.status(204).send();
});

// --- Daily Period (the modal's period-of-day column headers) ---

timetableRouter.get("/daily-periods", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM daily_periods ORDER BY period_no ASC").all();
  res.json({ periods: rows });
});

timetableRouter.post("/daily-periods", requireAuth, (req, res) => {
  const b = req.body ?? {};
  if (!b.startTime || !b.endTime) return res.status(400).json({ error: "Start and end time are required" });

  const maxNo = (db.prepare("SELECT MAX(period_no) as m FROM daily_periods").get() as { m: number | null }).m ?? 0;
  const info = db
    .prepare("INSERT INTO daily_periods (period_no, start_time, end_time) VALUES (?, ?, ?)")
    .run(maxNo + 1, b.startTime, b.endTime);

  const period = db.prepare("SELECT * FROM daily_periods WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ period });
});

timetableRouter.put("/daily-periods/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM daily_periods WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Period not found" });

  const b = req.body ?? {};
  db.prepare("UPDATE daily_periods SET start_time = ?, end_time = ? WHERE id = ?").run(
    b.startTime ?? existing.start_time,
    b.endTime ?? existing.end_time,
    id
  );

  const period = db.prepare("SELECT * FROM daily_periods WHERE id = ?").get(id);
  res.json({ period });
});

timetableRouter.delete("/daily-periods/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM daily_periods WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Period not found" });
  res.status(204).send();
});

// --- Teachers (Time Table > Teachers, synced read-only from HR & Staff's المدرسين division) ---

timetableRouter.get("/teachers", requireAuth, (req, res) => {
  const { q } = req.query as { q?: string };

  let sql = `
    SELECT hr_employees.id as employee_id, hr_employees.name_ar as name, hr_employees.status as employee_status,
           hr_employees.section as section, hr_employees.subject_id as subject_id,
           COALESCE(timetable_teacher_overrides.active, 1) as active
    FROM hr_employees
    LEFT JOIN timetable_teacher_overrides ON timetable_teacher_overrides.employee_id = hr_employees.id
    WHERE hr_employees.division = 'المدرسين'`;
  const params: any[] = [];
  if (q) {
    sql += " AND hr_employees.name_ar LIKE ?";
    params.push(`%${q}%`);
  }
  sql += " ORDER BY hr_employees.name_ar ASC";

  const rows = db.prepare(sql).all(...params);
  res.json({ teachers: rows });
});

timetableRouter.put("/teachers/:employeeId/active", requireAuth, (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const active = req.body?.active ? 1 : 0;
  db.prepare(
    `INSERT INTO timetable_teacher_overrides (employee_id, active) VALUES (?, ?)
     ON CONFLICT(employee_id) DO UPDATE SET active = excluded.active`
  ).run(employeeId, active);
  res.json({ ok: true });
});

timetableRouter.delete("/teachers/:employeeId/active", requireAuth, (req, res) => {
  const employeeId = Number(req.params.employeeId);
  db.prepare("DELETE FROM timetable_teacher_overrides WHERE employee_id = ?").run(employeeId);
  res.json({ ok: true });
});

// --- Overview (the Time Table icon's class cards — one row per class, no N+1 calls) ---

timetableRouter.get("/overview", requireAuth, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT classes.id as class_id,
              COUNT(timetable_entries.id) as entry_count,
              COALESCE(class_timetable_status.posted, 0) as posted
       FROM classes
       LEFT JOIN timetable_entries ON timetable_entries.class_id = classes.id
       LEFT JOIN class_timetable_status ON class_timetable_status.class_id = classes.id
       GROUP BY classes.id`
    )
    .all() as { class_id: number; entry_count: number; posted: number }[];
  res.json({
    overview: rows.map((r) => ({ classId: r.class_id, entryCount: r.entry_count, posted: Boolean(r.posted) })),
  });
});

// --- Time Table Post (lock a class's timetable against further edits) ---

timetableRouter.get("/status/:classId", requireAuth, (req, res) => {
  const classId = Number(req.params.classId);
  const row = db.prepare("SELECT posted, posted_at FROM class_timetable_status WHERE class_id = ?").get(classId) as
    | { posted: number; posted_at: string | null }
    | undefined;
  res.json({ posted: Boolean(row?.posted), postedAt: row?.posted_at ?? null });
});

timetableRouter.post("/status/:classId/toggle", requireAuth, (req, res) => {
  const classId = Number(req.params.classId);
  const current = isClassPosted(classId);
  const next = !current;
  db.prepare(
    `INSERT INTO class_timetable_status (class_id, posted, posted_at) VALUES (?, ?, ?)
     ON CONFLICT(class_id) DO UPDATE SET posted = excluded.posted, posted_at = excluded.posted_at`
  ).run(classId, next ? 1 : 0, next ? new Date().toISOString() : null);
  res.json({ posted: next });
});

// --- Random Table (best-effort auto-fill of empty cells for one class) ---

timetableRouter.post("/random/:classId", requireAuth, (req, res) => {
  const classId = Number(req.params.classId);
  if (isClassPosted(classId)) {
    return res.status(409).json({ error: "This class's timetable has been posted and can no longer be edited" });
  }

  const classRow = db.prepare("SELECT level_id FROM classes WHERE id = ?").get(classId) as
    | { level_id: number }
    | undefined;
  if (!classRow) return res.status(404).json({ error: "Class not found" });

  const subjects = db
    .prepare(
      `SELECT subjects.* FROM subjects
       JOIN subject_levels ON subject_levels.subject_id = subjects.id
       WHERE subject_levels.level_id = ? AND subjects.weekly_periods > 0
       ORDER BY subjects.name ASC`
    )
    .all(classRow.level_id) as { id: number; name: string; weekly_periods: number }[];

  const periods = db.prepare("SELECT period_no FROM daily_periods ORDER BY period_no ASC").all() as {
    period_no: number;
  }[];
  const existingEntries = db
    .prepare("SELECT day_of_week, period_no, subject_id FROM timetable_entries WHERE class_id = ?")
    .all(classId) as { day_of_week: number; period_no: number; subject_id: number | null }[];

  const filled = new Set(existingEntries.map((e) => `${e.day_of_week}:${e.period_no}`));
  const remaining = new Map(subjects.map((s) => [s.id, s.weekly_periods]));
  for (const e of existingEntries) {
    if (e.subject_id && remaining.has(e.subject_id)) {
      remaining.set(e.subject_id, Math.max(0, (remaining.get(e.subject_id) ?? 0) - 1));
    }
  }

  const insert = db.prepare(
    `INSERT INTO timetable_entries (class_id, day_of_week, period_no, subject, subject_id)
     VALUES (?, ?, ?, ?, ?)`
  );

  let created = 0;
  let subjectCursor = 0;
  for (let day = 0; day < DAY_COUNT && subjects.length > 0; day++) {
    const usedToday = new Set<number>();
    for (const period of periods) {
      const key = `${day}:${period.period_no}`;
      if (filled.has(key)) continue;

      let pick: (typeof subjects)[number] | null = null;
      for (let attempt = 0; attempt < subjects.length; attempt++) {
        const candidate = subjects[(subjectCursor + attempt) % subjects.length];
        if ((remaining.get(candidate.id) ?? 0) > 0 && !usedToday.has(candidate.id)) {
          pick = candidate;
          subjectCursor = (subjectCursor + attempt + 1) % subjects.length;
          break;
        }
      }
      if (!pick) continue;

      insert.run(classId, day, period.period_no, pick.name, pick.id);
      remaining.set(pick.id, (remaining.get(pick.id) ?? 0) - 1);
      usedToday.add(pick.id);
      filled.add(key);
      created++;
    }
  }

  res.json({ created });
});
