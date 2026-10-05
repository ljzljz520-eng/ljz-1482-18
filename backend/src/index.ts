import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { errorMiddleware } from "./errors.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { resolveRouter } from "./routes/resolve.js";
import { sessionsRouter } from "./routes/sessions.js";
import { materialsRouter } from "./routes/materials.js";
import { scriptsRouter } from "./routes/scripts.js";
import { snapshotsRouter } from "./routes/snapshots.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
  if (env.nodeEnv !== "test") {
    logger.info(`${req.method} ${req.originalUrl}`);
  }
  next();
});

app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", service: "creation-workbench-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/projects", resolveRouter);
app.use("/api/projects", sessionsRouter);
app.use("/api/projects", materialsRouter);
app.use("/api/projects", scriptsRouter);
app.use("/api/projects", snapshotsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "接口不存在" } });
});

app.use(errorMiddleware);

app.listen(env.port, () => {
  logger.info(`creation-workbench backend listening on :${env.port}`);
});
