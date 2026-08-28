import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { signToken, requireAuth, AuthedRequest } from "../auth";
import { getUserModules, MODULE_KEYS } from "../permissions";
import { masterAccount } from "../masterAccount";

export const authRouter = Router();

// The master account is a fixed, ID-0 identity: it isn't a users-table row, so its login
// check runs before touching the DB, and its full-access modules list is hardcoded rather
// than looked up.
const MASTER_ID = 0;

authRouter.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  if (username === masterAccount.username && password === masterAccount.password) {
    const token = signToken({
      id: MASTER_ID,
      username: masterAccount.username,
      full_name: masterAccount.fullName,
      role: "master",
    });
    return res.json({
      token,
      user: {
        id: MASTER_ID,
        username: masterAccount.username,
        full_name: masterAccount.fullName,
        role: "master",
        modules: [...MODULE_KEYS],
      },
    });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as
    | { id: number; username: string; password_hash: string; full_name: string; role: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signToken({ id: user.id, username: user.username, full_name: user.full_name });
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      modules: getUserModules(user.id, user.role),
    },
  });
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  if (req.user?.role === "master") {
    return res.json({
      user: {
        id: MASTER_ID,
        username: masterAccount.username,
        full_name: masterAccount.fullName,
        role: "master",
        modules: [...MODULE_KEYS],
      },
    });
  }

  const row = db.prepare("SELECT id, username, full_name, role FROM users WHERE id = ?").get(req.user!.id) as
    | { id: number; username: string; full_name: string; role: string }
    | undefined;
  if (!row) return res.status(401).json({ error: "User not found" });

  res.json({ user: { ...row, modules: getUserModules(row.id, row.role) } });
});
