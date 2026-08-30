import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireModule } from "../permissions";

export const hrLeaveRouter = Router();
hrLeaveRouter.use(requireModule("hrEmployees"));

const LEDGER_SELECT = `
  SELECT hr_leave_ledger.*, hr_valued_items.name as leave_type_name
  FROM hr_leave_ledger
  JOIN hr_valued_items ON hr_valued_items.id = hr_leave_ledger.leave_type_id
`;

function daysBetween(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

hrLeaveRouter.get("/:employeeId", requireAuth, (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const rows = db
    .prepare(`${LEDGER_SELECT} WHERE hr_leave_ledger.employee_id = ? ORDER BY hr_leave_ledger.entry_date ASC, hr_leave_ledger.id ASC`)
    .all(employeeId);
  res.json({ ledger: rows });
});

hrLeaveRouter.post("/", requireAuth, (req, res) => {
  const b = req.body ?? {};
  if (!b.employeeId || !b.schoolId || !b.leaveTypeId || !b.entryDate || !b.kind) {
    return res.status(400).json({ error: "employeeId, schoolId, leaveTypeId, entryDate and kind are required" });
  }

  let count: number;
  let leaveStart: string | null = null;
  let leaveEnd: string | null = null;

  if (b.kind === "leave") {
    if (!b.leaveStart || !b.leaveEnd) {
      return res.status(400).json({ error: "leaveStart and leaveEnd are required for a leave entry" });
    }
    leaveStart = b.leaveStart;
    leaveEnd = b.leaveEnd;
    count = -Math.max(1, daysBetween(b.leaveStart, b.leaveEnd));
  } else {
    if (typeof b.count !== "number") return res.status(400).json({ error: "count is required for an opening balance" });
    count = b.count;
  }

  const info = db
    .prepare(
      `INSERT INTO hr_leave_ledger (employee_id, school_id, entry_date, leave_type_id, leave_start, leave_end, count, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(b.employeeId, b.schoolId, b.entryDate, b.leaveTypeId, leaveStart, leaveEnd, count, b.kind);

  const entry = db.prepare(`${LEDGER_SELECT} WHERE hr_leave_ledger.id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ entry });
});

hrLeaveRouter.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM hr_leave_ledger WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Entry not found" });
  res.status(204).send();
});
