import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { requireAuth } from "./middleware/auth.js";
import projectsRouter from "./routes/projects.js";
import { makeCollectionRouter } from "./routes/collections.js";

const app = express();

// Tests drive the app in-process and assert on responses, not logs. Keep the
// HTTP request log out of the test output (USE_MEMORY_DB=1 / NODE_ENV=test).
const QUIET =
  process.env.USE_MEMORY_DB === "1" || process.env.NODE_ENV === "test";

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "5mb" }));
if (!QUIET) app.use(morgan("dev"));

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

// Centralized error handler. Expected client errors (4xx — bad input, missing
// auth, unknown project) carry an explicit `err.status` and are returned as the
// documented `{ error }` shape without noise. Anything without a status is an
// unexpected server fault, so log it and return a generic 500.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500 && !QUIET) console.error(err);
  // Malformed JSON bodies surface as body-parser SyntaxErrors (status 400);
  // give them a stable message instead of leaking parser internals.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }
  res
    .status(status)
    .json({ error: status >= 500 ? "Server error" : err.message || "Error" });
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
