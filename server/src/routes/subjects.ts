import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireModule } from "../permissions";

export const subjectsRouter = Router();
subjectsRouter.use(requireModule("timetable"));

function withLevelIds(subject: any) {
  const levelIds = (
    db.prepare("SELECT level_id FROM subject_levels WHERE subject_id = ?").all(subject.id) as { level_id: number }[]
  ).map((r) => r.level_id);
  return { ...subject, level_ids: levelIds };
}

subjectsRouter.get("/", requireAuth, (req, res) => {
  const { levelId } = req.query as { levelId?: string };

  let subjects: any[];
  if (levelId) {
    subjects = db
      .prepare(
        `SELECT subjects.* FROM subjects
         JOIN subject_levels ON subject_levels.subject_id = subjects.id
         WHERE subject_levels.level_id = ?
         ORDER BY subjects.name ASC`
      )
      .all(Number(levelId));
  } else {
    subjects = db.prepare("SELECT * FROM subjects ORDER BY name ASC").all();
  }

  res.json({ subjects: subjects.map(withLevelIds) });
});

function setLevels(subjectId: number, levelIds: unknown) {
  db.prepare("DELETE FROM subject_levels WHERE subject_id = ?").run(subjectId);
  if (!Array.isArray(levelIds)) return;
  const insert = db.prepare("INSERT OR IGNORE INTO subject_levels (subject_id, level_id) VALUES (?, ?)");
  for (const raw of levelIds) {
    const levelId = Number(raw);
    if (Number.isInteger(levelId)) insert.run(subjectId, levelId);
  }
}

subjectsRouter.post("/", requireAuth, (req, res) => {
  const b = req.body ?? {};
  if (!b.name) return res.status(400).json({ error: "Name is required" });

  const info = db
    .prepare(
      `INSERT INTO subjects (name, color, ig_subject, weekly_periods, price, category)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(b.name, b.color ?? null, b.igSubject ? 1 : 0, b.weeklyPeriods ?? 0, b.price ?? 0, b.category ?? null);

  const subjectId = Number(info.lastInsertRowid);
  setLevels(subjectId, b.levelIds);

  const subject = db.prepare("SELECT * FROM subjects WHERE id = ?").get(subjectId);
  res.status(201).json({ subject: withLevelIds(subject) });
});

subjectsRouter.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM subjects WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Subject not found" });

  const b = req.body ?? {};
  db.prepare(
    `UPDATE subjects SET name = ?, color = ?, ig_subject = ?, weekly_periods = ?, price = ?, category = ?
     WHERE id = ?`
  ).run(
    b.name ?? existing.name,
    b.color ?? existing.color,
    b.igSubject === undefined ? existing.ig_subject : b.igSubject ? 1 : 0,
    b.weeklyPeriods ?? existing.weekly_periods,
    b.price ?? existing.price,
    b.category ?? existing.category,
    id
  );

  if (b.levelIds !== undefined) setLevels(id, b.levelIds);

  const subject = db.prepare("SELECT * FROM subjects WHERE id = ?").get(id);
  res.json({ subject: withLevelIds(subject) });
});

subjectsRouter.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM subjects WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Subject not found" });
  res.status(204).send();
});
