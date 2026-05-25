import { Router } from "express";
import {
  projectsCol,
  projectDoc,
  subCol,
  assertProjectExists,
  listCollection,
} from "../lib/store.js";

const router = Router();

const DEFAULT_FINANCIAL_CONFIG = {
  submissionStartDay: 20,
  submissionEndType: "last",
  submissionEndDay: 30,
  validationDeadline: 5,
};

const SUB_COLLECTIONS = ["ftms", "lots", "personnel", "standaloneOs"];

// GET /api/projects -> list the caller's projects
router.get("/", async (req, res, next) => {
  try {
    const snap = await projectsCol(req.uid).orderBy("createdAt", "asc").get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err) {
    next(err);
  }
});

// POST /api/projects { name } -> create a project
router.post("/", async (req, res, next) => {
  try {
    const rawName = req.body?.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) return res.status(400).json({ error: "name is required" });

    const ref = projectsCol(req.uid).doc();
    const project = {
      id: ref.id,
      name,
      version: 2,
      financialConfig: DEFAULT_FINANCIAL_CONFIG,
      createdAt: new Date().toISOString(),
    };
    await ref.set(project);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId -> project meta
router.get("/:projectId", async (req, res, next) => {
  try {
    const snap = await assertProjectExists(req.uid, req.params.projectId);
    res.json(snap.data());
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId/bootstrap -> everything needed to render the board
router.get("/:projectId/bootstrap", async (req, res, next) => {
  try {
    const { uid } = req;
    const { projectId } = req.params;
    const snap = await assertProjectExists(uid, projectId);
    const [ftms, lots, personnel, standaloneOs] = await Promise.all(
      SUB_COLLECTIONS.map((c) => listCollection(uid, projectId, c)),
    );
    res.json({ project: snap.data(), ftms, lots, personnel, standaloneOs });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:projectId { name?, financialConfig? } -> update meta
router.put("/:projectId", async (req, res, next) => {
  try {
    const { uid } = req;
    const { projectId } = req.params;
    await assertProjectExists(uid, projectId);

    const body = req.body ?? {};
    const patch = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res
          .status(400)
          .json({ error: "name must be a non-empty string" });
      }
      patch.name = body.name.trim();
    }
    if (body.financialConfig !== undefined) {
      const fc = body.financialConfig;
      if (fc === null || typeof fc !== "object" || Array.isArray(fc)) {
        return res
          .status(400)
          .json({ error: "financialConfig must be an object" });
      }
      patch.financialConfig = fc;
    }

    await projectDoc(uid, projectId).set(patch, { merge: true });
    const updated = await projectDoc(uid, projectId).get();
    res.json(updated.data());
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId -> delete project and all sub-collections
router.delete("/:projectId", async (req, res, next) => {
  try {
    const { uid } = req;
    const { projectId } = req.params;
    await assertProjectExists(uid, projectId);

    for (const name of SUB_COLLECTIONS) {
      const col = subCol(uid, projectId, name);
      // Delete in batches of 400 (Firestore batch limit is 500).
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const docs = await col.limit(400).get();
        if (docs.empty) break;
        const batch = col.firestore.batch();
        docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        if (docs.size < 400) break;
      }
    }
    await projectDoc(uid, projectId).delete();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
