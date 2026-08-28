import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";
import { requireAdmin, getUserRole, getUserModules, MODULE_KEYS, isModuleKey } from "../permissions";

export const permissionsRouter = Router();

permissionsRouter.get("/:userId", requireAuth, requireAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const role = getUserRole(userId);
  if (!role) return res.status(404).json({ error: "User not found" });

  res.json({ role, modules: getUserModules(userId, role) });
});

permissionsRouter.put("/:userId", requireAuth, requireAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const role = getUserRole(userId);
  if (!role) return res.status(404).json({ error: "User not found" });
  if (role === "admin") {
    return res.status(400).json({ error: "Admins always have full access — there's nothing to set" });
  }

  const modules = req.body?.modules;
  if (!Array.isArray(modules) || !modules.every((m) => typeof m === "string" && isModuleKey(m))) {
    return res.status(400).json({ error: `modules must be an array made up of: ${MODULE_KEYS.join(", ")}` });
  }

  const tx = db.transaction((mods: string[]) => {
    db.prepare("DELETE FROM user_permissions WHERE user_id = ?").run(userId);
    const insert = db.prepare("INSERT INTO user_permissions (user_id, module) VALUES (?, ?)");
    for (const m of mods) insert.run(userId, m);
  });
  tx(modules as string[]);

  res.json({ role, modules: getUserModules(userId, role) });
});
