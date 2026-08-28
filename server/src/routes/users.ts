import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { requireAuth, type AuthedRequest } from "../auth";
import { requireModule, isAdminOrMaster } from "../permissions";
import { masterAccount } from "../masterAccount";

export const usersRouter = Router();
usersRouter.use(requireModule("control"));

const SAFE_COLUMNS = "id, username, full_name, role";

usersRouter.get("/", requireAuth, (_req, res) => {
  const rows = db.prepare(`SELECT ${SAFE_COLUMNS} FROM users ORDER BY username ASC`).all();
  res.json({ users: rows });
});

usersRouter.post("/", requireAuth, (req: AuthedRequest, res) => {
  const b = req.body ?? {};
  if (!b.username || !b.password || !b.fullName) {
    return res.status(400).json({ error: "username, password and fullName are required" });
  }

  const requestedRole = typeof b.role === "string" && b.role ? b.role : "staff";
  if (requestedRole === "admin" && !isAdminOrMaster(req)) {
    return res.status(403).json({ error: "Only an admin can grant the admin role" });
  }

  if (b.username === masterAccount.username) {
    return res.status(409).json({ error: "That username is reserved for the master account" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(b.username);
  if (existing) return res.status(409).json({ error: "Username already taken" });

  const hash = bcrypt.hashSync(b.password, 10);
  const info = db
    .prepare("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)")
    .run(b.username, hash, b.fullName, requestedRole);

  const user = db.prepare(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ user });
});

usersRouter.put("/:id", requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "User not found" });

  const requesterIsPrivileged = isAdminOrMaster(req);
  if (existing.role === "admin" && !requesterIsPrivileged) {
    return res.status(403).json({ error: "Only an admin can edit an admin account" });
  }

  const b = req.body ?? {};
  const requestedRole = typeof b.role === "string" && b.role ? b.role : existing.role;
  if (requestedRole === "admin" && !requesterIsPrivileged) {
    return res.status(403).json({ error: "Only an admin can grant the admin role" });
  }

  const hash = b.password ? bcrypt.hashSync(b.password, 10) : existing.password_hash;

  db.prepare("UPDATE users SET full_name = ?, role = ?, password_hash = ? WHERE id = ?").run(
    b.fullName ?? existing.full_name,
    requestedRole,
    hash,
    id
  );

  const user = db.prepare(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = ?`).get(id);
  res.json({ user });
});

usersRouter.delete("/:id", requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (id === req.user?.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!target) return res.status(404).json({ error: "User not found" });

  if (target.role === "admin" && !isAdminOrMaster(req)) {
    return res.status(403).json({ error: "Only an admin can delete an admin account" });
  }

  const adminCount = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }
  ).c;
  if (target.role === "admin" && adminCount <= 1) {
    return res.status(400).json({ error: "Cannot delete the last remaining admin" });
  }

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM user_permissions WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  tx();
  res.status(204).send();
});
