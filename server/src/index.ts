import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import "./db";
import { authRouter } from "./routes/auth";
import { studentsRouter } from "./routes/students";
import { classesRouter } from "./routes/classes";
import { financeRouter } from "./routes/finance";
import { timetableRouter } from "./routes/timetable";
import { busesRouter } from "./routes/buses";
import { inventoryRouter } from "./routes/inventory";
import { usersRouter } from "./routes/users";
import { staffRouter } from "./routes/staff";
import { settingsRouter } from "./routes/settings";
import { attendanceRouter } from "./routes/attendance";
import { admissionsRouter } from "./routes/admissions";
import { permissionsRouter } from "./routes/permissions";
import { presenceRouter } from "./routes/presence";
import { activityRouter } from "./routes/activity";
import { activityLogger } from "./activityLog";

const app = express();
app.use(cors());
app.use(express.json());
app.use(activityLogger);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/finance", financeRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/buses", busesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/users", usersRouter);
app.use("/api/staff", staffRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/admissions", admissionsRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/presence", presenceRouter);
app.use("/api/activity", activityRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`Edu-Hub API listening on http://localhost:${PORT}`);
});
