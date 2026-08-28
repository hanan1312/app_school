import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireModule } from "../permissions";

export const timetableRouter = Router();
timetableRouter.use(requireModule("timetable"));

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
  if (!b.classId || b.dayOfWeek == null || !b.periodNo || !b.subject) {
    return res.status(400).json({ error: "classId, dayOfWeek, periodNo and subject are required" });
  }

  const existing = db
    .prepare("SELECT id FROM timetable_entries WHERE class_id = ? AND day_of_week = ? AND period_no = ?")
    .get(b.classId, b.dayOfWeek, b.periodNo);
  if (existing) {
    return res.status(409).json({ error: "This period is already scheduled for that day" });
  }

  const info = db
    .prepare(
      `INSERT INTO timetable_entries (class_id, day_of_week, period_no, start_time, end_time, subject, teacher_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(b.classId, b.dayOfWeek, b.periodNo, b.startTime ?? null, b.endTime ?? null, b.subject, b.teacherName ?? null);

  const entry = db.prepare("SELECT * FROM timetable_entries WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ entry });
});

timetableRouter.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM timetable_entries WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Entry not found" });

  const b = req.body ?? {};
  db.prepare(
    `UPDATE timetable_entries SET
      day_of_week = ?, period_no = ?, start_time = ?, end_time = ?, subject = ?, teacher_name = ?
     WHERE id = ?`
  ).run(
    b.dayOfWeek ?? existing.day_of_week,
    b.periodNo ?? existing.period_no,
    b.startTime ?? existing.start_time,
    b.endTime ?? existing.end_time,
    b.subject ?? existing.subject,
    b.teacherName ?? existing.teacher_name,
    id
  );

  const entry = db.prepare("SELECT * FROM timetable_entries WHERE id = ?").get(id);
  res.json({ entry });
});

timetableRouter.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM timetable_entries WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Entry not found" });
  res.status(204).send();
});
