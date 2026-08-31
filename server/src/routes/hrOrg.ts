import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireModule } from "../permissions";

export const hrOrgRouter = Router();
hrOrgRouter.use(requireModule("hrEmployees"));

function buildTreeResponse(schoolId: number) {
  const divisions = db
    .prepare("SELECT * FROM hr_org_divisions WHERE school_id = ? ORDER BY sort_order")
    .all(schoolId) as any[];
  const sections = db
    .prepare(
      `SELECT hr_org_sections.* FROM hr_org_sections
       JOIN hr_org_divisions ON hr_org_divisions.id = hr_org_sections.division_id
       WHERE hr_org_divisions.school_id = ?
       ORDER BY hr_org_sections.sort_order`
    )
    .all(schoolId) as any[];
  const jobs = db
    .prepare(
      `SELECT hr_org_jobs.* FROM hr_org_jobs
       JOIN hr_org_sections ON hr_org_sections.id = hr_org_jobs.section_id
       JOIN hr_org_divisions ON hr_org_divisions.id = hr_org_sections.division_id
       WHERE hr_org_divisions.school_id = ?
       ORDER BY hr_org_jobs.sort_order`
    )
    .all(schoolId) as any[];

  const tree = divisions.map((division) => ({
    id: division.id,
    division: division.name,
    sections: sections
      .filter((s) => s.division_id === division.id)
      .map((section) => ({
        id: section.id,
        section: section.name,
        jobs: jobs.filter((j) => j.section_id === section.id).map((j) => ({ id: j.id, job: j.name })),
      })),
  }));

  return { tree };
}

hrOrgRouter.get("/", requireAuth, (req, res) => {
  const { schoolId } = req.query as { schoolId?: string };
  if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
  res.json(buildTreeResponse(Number(schoolId)));
});

hrOrgRouter.post("/divisions", requireAuth, (req, res) => {
  const { schoolId, name: rawName } = req.body ?? {};
  const name = (rawName ?? "").trim();
  if (!schoolId || !name) return res.status(400).json({ error: "schoolId and name are required" });

  const maxOrder = (
    db.prepare("SELECT MAX(sort_order) as m FROM hr_org_divisions WHERE school_id = ?").get(schoolId) as {
      m: number | null;
    }
  ).m ?? -1;
  db.prepare("INSERT INTO hr_org_divisions (school_id, name, sort_order) VALUES (?, ?, ?)").run(
    schoolId,
    name,
    maxOrder + 1
  );

  res.status(201).json(buildTreeResponse(Number(schoolId)));
});

hrOrgRouter.put("/divisions/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Division name is required" });

  const division = db.prepare("SELECT * FROM hr_org_divisions WHERE id = ?").get(id) as any;
  if (!division) return res.status(404).json({ error: "Division not found" });

  db.prepare("UPDATE hr_org_divisions SET name = ? WHERE id = ?").run(name, id);
  res.json(buildTreeResponse(division.school_id));
});

hrOrgRouter.delete("/divisions/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const division = db.prepare("SELECT * FROM hr_org_divisions WHERE id = ?").get(id) as any;
  if (!division) return res.status(404).json({ error: "Division not found" });

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM hr_org_jobs WHERE section_id IN (SELECT id FROM hr_org_sections WHERE division_id = ?)").run(id);
    db.prepare("DELETE FROM hr_org_sections WHERE division_id = ?").run(id);
    db.prepare("DELETE FROM hr_org_divisions WHERE id = ?").run(id);
  });
  tx();

  res.json(buildTreeResponse(division.school_id));
});

hrOrgRouter.post("/divisions/:divisionId/sections", requireAuth, (req, res) => {
  const divisionId = Number(req.params.divisionId);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Section name is required" });

  const division = db.prepare("SELECT * FROM hr_org_divisions WHERE id = ?").get(divisionId) as any;
  if (!division) return res.status(404).json({ error: "Division not found" });

  const maxOrder = (
    db.prepare("SELECT MAX(sort_order) as m FROM hr_org_sections WHERE division_id = ?").get(divisionId) as {
      m: number | null;
    }
  ).m ?? -1;
  db.prepare("INSERT INTO hr_org_sections (division_id, name, sort_order) VALUES (?, ?, ?)").run(
    divisionId,
    name,
    maxOrder + 1
  );

  res.status(201).json(buildTreeResponse(division.school_id));
});

hrOrgRouter.put("/sections/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Section name is required" });

  const section = db
    .prepare(
      `SELECT hr_org_sections.*, hr_org_divisions.school_id as school_id
       FROM hr_org_sections JOIN hr_org_divisions ON hr_org_divisions.id = hr_org_sections.division_id
       WHERE hr_org_sections.id = ?`
    )
    .get(id) as any;
  if (!section) return res.status(404).json({ error: "Section not found" });

  db.prepare("UPDATE hr_org_sections SET name = ? WHERE id = ?").run(name, id);
  res.json(buildTreeResponse(section.school_id));
});

hrOrgRouter.delete("/sections/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const section = db
    .prepare(
      `SELECT hr_org_sections.*, hr_org_divisions.school_id as school_id
       FROM hr_org_sections JOIN hr_org_divisions ON hr_org_divisions.id = hr_org_sections.division_id
       WHERE hr_org_sections.id = ?`
    )
    .get(id) as any;
  if (!section) return res.status(404).json({ error: "Section not found" });

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM hr_org_jobs WHERE section_id = ?").run(id);
    db.prepare("DELETE FROM hr_org_sections WHERE id = ?").run(id);
  });
  tx();

  res.json(buildTreeResponse(section.school_id));
});

hrOrgRouter.post("/sections/:sectionId/jobs", requireAuth, (req, res) => {
  const sectionId = Number(req.params.sectionId);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Job name is required" });

  const section = db
    .prepare(
      `SELECT hr_org_sections.*, hr_org_divisions.school_id as school_id
       FROM hr_org_sections JOIN hr_org_divisions ON hr_org_divisions.id = hr_org_sections.division_id
       WHERE hr_org_sections.id = ?`
    )
    .get(sectionId) as any;
  if (!section) return res.status(404).json({ error: "Section not found" });

  const maxOrder = (
    db.prepare("SELECT MAX(sort_order) as m FROM hr_org_jobs WHERE section_id = ?").get(sectionId) as {
      m: number | null;
    }
  ).m ?? -1;
  db.prepare("INSERT INTO hr_org_jobs (section_id, name, sort_order) VALUES (?, ?, ?)").run(
    sectionId,
    name,
    maxOrder + 1
  );

  res.status(201).json(buildTreeResponse(section.school_id));
});

hrOrgRouter.put("/jobs/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Job name is required" });

  const job = db
    .prepare(
      `SELECT hr_org_jobs.*, hr_org_divisions.school_id as school_id
       FROM hr_org_jobs
       JOIN hr_org_sections ON hr_org_sections.id = hr_org_jobs.section_id
       JOIN hr_org_divisions ON hr_org_divisions.id = hr_org_sections.division_id
       WHERE hr_org_jobs.id = ?`
    )
    .get(id) as any;
  if (!job) return res.status(404).json({ error: "Job not found" });

  db.prepare("UPDATE hr_org_jobs SET name = ? WHERE id = ?").run(name, id);
  res.json(buildTreeResponse(job.school_id));
});

hrOrgRouter.delete("/jobs/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const job = db
    .prepare(
      `SELECT hr_org_jobs.*, hr_org_divisions.school_id as school_id
       FROM hr_org_jobs
       JOIN hr_org_sections ON hr_org_sections.id = hr_org_jobs.section_id
       JOIN hr_org_divisions ON hr_org_divisions.id = hr_org_sections.division_id
       WHERE hr_org_jobs.id = ?`
    )
    .get(id) as any;
  if (!job) return res.status(404).json({ error: "Job not found" });

  db.prepare("DELETE FROM hr_org_jobs WHERE id = ?").run(id);
  res.json(buildTreeResponse(job.school_id));
});
