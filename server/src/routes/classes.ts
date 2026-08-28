import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";

export const classesRouter = Router();

function buildTreeResponse() {
  const stages = db.prepare("SELECT * FROM stages ORDER BY sort_order").all() as any[];
  const levels = db.prepare("SELECT * FROM levels ORDER BY sort_order").all() as any[];
  const classes = db.prepare("SELECT * FROM classes ORDER BY sort_order").all() as any[];

  const tree = stages.map((stage) => ({
    id: stage.id,
    stage: stage.name,
    levels: levels
      .filter((l) => l.stage_id === stage.id)
      .map((level) => ({
        id: level.id,
        level: level.name,
        classes: classes
          .filter((c) => c.level_id === level.id)
          .map((c) => ({ id: c.id, className: c.class_name })),
      })),
  }));

  return { tree, flat: classes };
}

classesRouter.get("/", requireAuth, (_req, res) => {
  res.json(buildTreeResponse());
});

classesRouter.post("/stages", requireAuth, (req, res) => {
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Stage name is required" });

  const maxOrder = (db.prepare("SELECT MAX(sort_order) as m FROM stages").get() as { m: number | null }).m ?? -1;
  db.prepare("INSERT INTO stages (name, sort_order) VALUES (?, ?)").run(name, maxOrder + 1);

  res.status(201).json(buildTreeResponse());
});

classesRouter.post("/stages/:stageId/levels", requireAuth, (req, res) => {
  const stageId = Number(req.params.stageId);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Level name is required" });

  const stage = db.prepare("SELECT id FROM stages WHERE id = ?").get(stageId);
  if (!stage) return res.status(404).json({ error: "Stage not found" });

  const maxOrder = (
    db.prepare("SELECT MAX(sort_order) as m FROM levels WHERE stage_id = ?").get(stageId) as { m: number | null }
  ).m ?? -1;
  db.prepare("INSERT INTO levels (stage_id, name, sort_order) VALUES (?, ?, ?)").run(stageId, name, maxOrder + 1);

  res.status(201).json(buildTreeResponse());
});

classesRouter.post("/levels/:levelId/classes", requireAuth, (req, res) => {
  const levelId = Number(req.params.levelId);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Class name is required" });

  const level = db
    .prepare(
      `SELECT levels.id as level_id, levels.name as level_name, stages.name as stage_name
       FROM levels JOIN stages ON stages.id = levels.stage_id
       WHERE levels.id = ?`
    )
    .get(levelId) as { level_id: number; level_name: string; stage_name: string } | undefined;
  if (!level) return res.status(404).json({ error: "Level not found" });

  const maxOrder = (
    db.prepare("SELECT MAX(sort_order) as m FROM classes WHERE level_id = ?").get(levelId) as { m: number | null }
  ).m ?? -1;
  db.prepare(
    "INSERT INTO classes (stage_label, level_label, class_name, sort_order, level_id) VALUES (?, ?, ?, ?, ?)"
  ).run(level.stage_name, level.level_name, name, maxOrder + 1, levelId);

  res.status(201).json(buildTreeResponse());
});

classesRouter.put("/stages/:stageId", requireAuth, (req, res) => {
  const stageId = Number(req.params.stageId);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Stage name is required" });

  const stage = db.prepare("SELECT id FROM stages WHERE id = ?").get(stageId);
  if (!stage) return res.status(404).json({ error: "Stage not found" });

  const tx = db.transaction(() => {
    db.prepare("UPDATE stages SET name = ? WHERE id = ?").run(name, stageId);
    db.prepare(
      "UPDATE classes SET stage_label = ? WHERE level_id IN (SELECT id FROM levels WHERE stage_id = ?)"
    ).run(name, stageId);
  });
  tx();

  res.json(buildTreeResponse());
});

classesRouter.delete("/stages/:stageId", requireAuth, (req, res) => {
  const stageId = Number(req.params.stageId);
  const stage = db.prepare("SELECT id FROM stages WHERE id = ?").get(stageId);
  if (!stage) return res.status(404).json({ error: "Stage not found" });

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE students SET class_id = NULL WHERE class_id IN (
         SELECT id FROM classes WHERE level_id IN (SELECT id FROM levels WHERE stage_id = ?)
       )`
    ).run(stageId);
    db.prepare("DELETE FROM classes WHERE level_id IN (SELECT id FROM levels WHERE stage_id = ?)").run(stageId);
    db.prepare("DELETE FROM levels WHERE stage_id = ?").run(stageId);
    db.prepare("DELETE FROM stages WHERE id = ?").run(stageId);
  });
  tx();

  res.json(buildTreeResponse());
});

classesRouter.put("/levels/:levelId", requireAuth, (req, res) => {
  const levelId = Number(req.params.levelId);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Level name is required" });

  const level = db.prepare("SELECT id FROM levels WHERE id = ?").get(levelId);
  if (!level) return res.status(404).json({ error: "Level not found" });

  const tx = db.transaction(() => {
    db.prepare("UPDATE levels SET name = ? WHERE id = ?").run(name, levelId);
    db.prepare("UPDATE classes SET level_label = ? WHERE level_id = ?").run(name, levelId);
  });
  tx();

  res.json(buildTreeResponse());
});

classesRouter.delete("/levels/:levelId", requireAuth, (req, res) => {
  const levelId = Number(req.params.levelId);
  const level = db.prepare("SELECT id FROM levels WHERE id = ?").get(levelId);
  if (!level) return res.status(404).json({ error: "Level not found" });

  const tx = db.transaction(() => {
    db.prepare("UPDATE students SET class_id = NULL WHERE class_id IN (SELECT id FROM classes WHERE level_id = ?)").run(
      levelId
    );
    db.prepare("DELETE FROM classes WHERE level_id = ?").run(levelId);
    db.prepare("DELETE FROM levels WHERE id = ?").run(levelId);
  });
  tx();

  res.json(buildTreeResponse());
});

classesRouter.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Class name is required" });

  const cls = db.prepare("SELECT id FROM classes WHERE id = ?").get(id);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  db.prepare("UPDATE classes SET class_name = ? WHERE id = ?").run(name, id);

  res.json(buildTreeResponse());
});

classesRouter.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const cls = db.prepare("SELECT id FROM classes WHERE id = ?").get(id);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const tx = db.transaction(() => {
    db.prepare("UPDATE students SET class_id = NULL WHERE class_id = ?").run(id);
    db.prepare("DELETE FROM classes WHERE id = ?").run(id);
  });
  tx();

  res.json(buildTreeResponse());
});
