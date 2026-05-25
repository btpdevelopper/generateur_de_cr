import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { requireAuth } from "./middleware/auth.js";
import projectsRouter from "./routes/projects.js";
import { makeCollectionRouter } from "./routes/collections.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// Public health check.
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Everything below requires a valid Firebase ID token.
app.use("/api/projects", requireAuth, projectsRouter);

// Per-project sub-collections. Mounted under each project id.
app.use(
  "/api/projects/:projectId/ftms",
  requireAuth,
  makeCollectionRouter("ftms"),
);
app.use(
  "/api/projects/:projectId/lots",
  requireAuth,
  makeCollectionRouter("lots"),
);
app.use(
  "/api/projects/:projectId/personnel",
  requireAuth,
  makeCollectionRouter("personnel"),
);
app.use(
  "/api/projects/:projectId/standaloneOs",
  requireAuth,
  makeCollectionRouter("standaloneOs"),
);

// Centralized error handler.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

// Only start listening when run as the entrypoint (node src/index.js), not when
// imported by the test suite, which drives the app via supertest in-process.
const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`Suivi Financier API listening on :${port}`);
  });
}

export default app;
