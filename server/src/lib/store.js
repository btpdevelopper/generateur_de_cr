import { db } from "../config/firebase.js";

// Data is scoped per authenticated user:
//   users/{uid}/projects/{projectId}                         (project meta + financialConfig)
//   users/{uid}/projects/{projectId}/{ftms|lots|personnel|standaloneOs}/{docId}
//
// Because every path is rooted at the caller's uid, a user can only ever
// read/write their own data — ownership is enforced by construction.

const VALID_COLLECTIONS = new Set([
  "ftms",
  "lots",
  "personnel",
  "standaloneOs",
]);

export function projectsCol(uid) {
  return db.collection("users").doc(uid).collection("projects");
}

export function projectDoc(uid, projectId) {
  return projectsCol(uid).doc(projectId);
}

export function subCol(uid, projectId, name) {
  if (!VALID_COLLECTIONS.has(name)) {
    const err = new Error(`Unknown collection: ${name}`);
    err.status = 400;
    throw err;
  }
  return projectDoc(uid, projectId).collection(name);
}

/** Throws 404 if the project does not exist for this user. */
export async function assertProjectExists(uid, projectId) {
  const snap = await projectDoc(uid, projectId).get();
  if (!snap.exists) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }
  return snap;
}

export async function listCollection(uid, projectId, name) {
  const snap = await subCol(uid, projectId, name).get();
  return snap.docs.map((d) => d.data());
}

export async function upsertDoc(uid, projectId, name, id, data) {
  await subCol(uid, projectId, name)
    .doc(id)
    .set({ ...data, id }, { merge: false });
  return { ...data, id };
}

export async function deleteDoc(uid, projectId, name, id) {
  await subCol(uid, projectId, name).doc(id).delete();
}
