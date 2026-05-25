import { Router } from "express";
import {
  assertProjectExists,
  listCollection,
  upsertDoc,
  deleteDoc,
} from "../lib/store.js";

// Builds a CRUD router for one per-project sub-collection
// (ftms | lots | personnel | standaloneOs). mergeParams lets us read
// :projectId from the mount path.
export function makeCollectionRouter(name) {
  const router = Router({ mergeParams: true });

  // GET / -> all documents in the collection
  router.get("/", async (req, res, next) => {
    try {
      await assertProjectExists(req.uid, req.params.projectId);
      res.json(await listCollection(req.uid, req.params.projectId, name));
    } catch (err) {
      next(err);
    }
  });

  // PUT /:id -> create or replace a document (body is the full object)
  router.put("/:id", async (req, res, next) => {
    try {
      const { uid } = req;
      const { projectId, id } = req.params;
      await assertProjectExists(uid, projectId);

      const data = req.body || {};
      if (data.id && data.id !== id) {
        return res.status(400).json({ error: "Body id does not match URL id" });
      }
      const saved = await upsertDoc(uid, projectId, name, id, data);
      res.json(saved);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /:id
  router.delete("/:id", async (req, res, next) => {
    try {
      const { uid } = req;
      const { projectId, id } = req.params;
      await assertProjectExists(uid, projectId);
      await deleteDoc(uid, projectId, name, id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
