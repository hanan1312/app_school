import { Response, NextFunction } from "express";
import { db } from "./db";
import { decodeToken, type AuthedRequest } from "./auth";

export const MODULE_KEYS = [
  "students",
  "finance",
  "control",
  "inventory",
  "timetable",
  "buses",
  "management",
  "configuration",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function getUserRole(userId: number): string | null {
  const row = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  return row?.role ?? null;
}

export function getUserModules(userId: number, role?: string | null): ModuleKey[] {
  const actualRole = role ?? getUserRole(userId);
  if (actualRole === "admin") return [...MODULE_KEYS];

  const rows = db.prepare("SELECT module FROM user_permissions WHERE user_id = ?").all(userId) as {
    module: string;
  }[];
  return rows.map((r) => r.module).filter(isModuleKey);
}

export function requireModule(moduleKey: ModuleKey) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const decoded = decodeToken(req);
    if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });
    req.user = decoded;

    const role = getUserRole(decoded.id);
    if (!role) return res.status(401).json({ error: "User not found" });
    if (role === "admin") return next();

    const granted = db
      .prepare("SELECT 1 FROM user_permissions WHERE user_id = ? AND module = ?")
      .get(decoded.id, moduleKey);
    if (!granted) return res.status(403).json({ error: "You don't have access to this module" });
    next();
  };
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const decoded = decodeToken(req);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });
  req.user = decoded;

  const role = getUserRole(decoded.id);
  if (role !== "admin") return res.status(403).json({ error: "Only an admin can do this" });
  next();
}
