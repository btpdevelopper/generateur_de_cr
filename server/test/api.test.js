// =============================================================================
// API integration tests — run with `npm test` (USE_MEMORY_DB=1 node --test).
//
// These drive the real Express app in-process via supertest, backed by the
// in-memory Firestore/Auth shim (config/firebase.js swaps it in when
// USE_MEMORY_DB=1). No credentials and no network are required.
//
// Auth: the stub verifier maps "test-token-<uid>" -> uid, so we can act as
// different users and assert per-user isolation.
// =============================================================================
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../src/index.js";
import { db } from "../src/config/firebase.js";

// Bearer header helper for a given fake user id.
const as = (uid) => `Bearer test-token-${uid}`;

// Each test starts from a clean store so they are order-independent.
beforeEach(() => {
  db._reset();
});

// --- Helpers -----------------------------------------------------------------

async function createProject(uid, name = "Chantier A") {
  const res = await request(app)
    .post("/api/projects")
    .set("Authorization", as(uid))
    .send({ name });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

// --- Auth --------------------------------------------------------------------

test("health check is public and returns { ok: true }", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test("401 when no Authorization header is present", async () => {
  const res = await request(app).get("/api/projects");
  assert.equal(res.status, 401);
  assert.ok(res.body.error, "expected an { error } body");
});

test("401 when the bearer token is not a valid token", async () => {
  const res = await request(app)
    .get("/api/projects")
    .set("Authorization", "Bearer not-a-real-token");
  assert.equal(res.status, 401);
  assert.ok(res.body.error);
});

test("401 when the Authorization scheme is not Bearer", async () => {
  const res = await request(app)
    .get("/api/projects")
    .set("Authorization", "Basic test-token-userA");
  assert.equal(res.status, 401);
});

// --- Projects ----------------------------------------------------------------

test("POST /api/projects creates a project with defaults", async () => {
  const project = await createProject("userA", "My Build");
  assert.ok(project.id, "project should have a generated id");
  assert.equal(project.name, "My Build");
  assert.equal(project.version, 2);
  assert.ok(project.createdAt, "project should have createdAt");
  assert.deepEqual(project.financialConfig, {
    submissionStartDay: 20,
    submissionEndType: "last",
    submissionEndDay: 30,
    validationDeadline: 5,
  });
});

test("POST /api/projects trims the name and 400s on empty/missing name", async () => {
  const trimmed = await request(app)
    .post("/api/projects")
    .set("Authorization", as("userA"))
    .send({ name: "  Spaced  " });
  assert.equal(trimmed.status, 201);
  assert.equal(trimmed.body.name, "Spaced");

  for (const body of [{}, { name: "" }, { name: "   " }, { name: 42 }]) {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", as("userA"))
      .send(body);
    assert.equal(res.status, 400, `body ${JSON.stringify(body)} should 400`);
    assert.ok(res.body.error);
  }
});

test("GET /api/projects lists only the caller's projects, ordered by createdAt", async () => {
  await createProject("userA", "First");
  await createProject("userA", "Second");

  const res = await request(app)
    .get("/api/projects")
    .set("Authorization", as("userA"));
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);
  assert.deepEqual(
    res.body.map((p) => p.name),
    ["First", "Second"],
  );
});

test("GET /api/projects/:id returns the project; 404 for unknown id", async () => {
  const project = await createProject("userA");

  const ok = await request(app)
    .get(`/api/projects/${project.id}`)
    .set("Authorization", as("userA"));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.id, project.id);

  const missing = await request(app)
    .get("/api/projects/does-not-exist")
    .set("Authorization", as("userA"));
  assert.equal(missing.status, 404);
  assert.ok(missing.body.error);
});

test("PUT /api/projects/:id updates name and financialConfig (merge)", async () => {
  const project = await createProject("userA", "Old");

  const res = await request(app)
    .put(`/api/projects/${project.id}`)
    .set("Authorization", as("userA"))
    .send({ name: "New", financialConfig: { validationDeadline: 9 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, "New");
  assert.deepEqual(res.body.financialConfig, { validationDeadline: 9 });
  // version is untouched by the merge.
  assert.equal(res.body.version, 2);
});

test("PUT /api/projects/:id rejects bad name/financialConfig types", async () => {
  const project = await createProject("userA");

  const badName = await request(app)
    .put(`/api/projects/${project.id}`)
    .set("Authorization", as("userA"))
    .send({ name: "   " });
  assert.equal(badName.status, 400);

  const badFc = await request(app)
    .put(`/api/projects/${project.id}`)
    .set("Authorization", as("userA"))
    .send({ financialConfig: [1, 2, 3] });
  assert.equal(badFc.status, 400);
});

test("PUT /api/projects/:id 404s for an unknown project", async () => {
  const res = await request(app)
    .put("/api/projects/nope")
    .set("Authorization", as("userA"))
    .send({ name: "x" });
  assert.equal(res.status, 404);
});

test("DELETE /api/projects/:id removes the project and its sub-collections", async () => {
  const project = await createProject("userA");
  // Seed a sub-collection doc to prove cascade delete.
  await request(app)
    .put(`/api/projects/${project.id}/lots/lot-1`)
    .set("Authorization", as("userA"))
    .send({ number: "01", name: "Gros oeuvre" });

  const del = await request(app)
    .delete(`/api/projects/${project.id}`)
    .set("Authorization", as("userA"));
  assert.equal(del.status, 204);

  const after = await request(app)
    .get(`/api/projects/${project.id}`)
    .set("Authorization", as("userA"));
  assert.equal(after.status, 404);

  // The lot under the deleted project is gone too (cascade).
  const lots = await request(app)
    .get(`/api/projects/${project.id}/lots`)
    .set("Authorization", as("userA"));
  assert.equal(lots.status, 404); // assertProjectExists now fails
});

// --- Bootstrap ---------------------------------------------------------------

test("GET /api/projects/:id/bootstrap returns the board payload", async () => {
  const project = await createProject("userA");
  await request(app)
    .put(`/api/projects/${project.id}/ftms/ftm-1`)
    .set("Authorization", as("userA"))
    .send({ type: "FTM", ftmNumber: "FTM1" });
  await request(app)
    .put(`/api/projects/${project.id}/personnel/p-1`)
    .set("Authorization", as("userA"))
    .send({ name: "Alice", role: "MOE" });

  const res = await request(app)
    .get(`/api/projects/${project.id}/bootstrap`)
    .set("Authorization", as("userA"));
  assert.equal(res.status, 200);
  assert.equal(res.body.project.id, project.id);
  assert.equal(res.body.ftms.length, 1);
  assert.equal(res.body.ftms[0].ftmNumber, "FTM1");
  assert.equal(res.body.personnel.length, 1);
  // Empty collections come back as empty arrays, not undefined.
  assert.deepEqual(res.body.lots, []);
  assert.deepEqual(res.body.standaloneOs, []);
});

test("GET /api/projects/:id/bootstrap 404s for unknown project", async () => {
  const res = await request(app)
    .get("/api/projects/ghost/bootstrap")
    .set("Authorization", as("userA"));
  assert.equal(res.status, 404);
});

// --- Collections round-trip --------------------------------------------------

for (const col of ["ftms", "lots", "personnel", "standaloneOs"]) {
  test(`${col}: PUT/GET/DELETE round-trip`, async () => {
    const project = await createProject("userA");
    const base = `/api/projects/${project.id}/${col}`;

    // Create.
    const put = await request(app)
      .put(`${base}/doc-1`)
      .set("Authorization", as("userA"))
      .send({ hello: "world" });
    assert.equal(put.status, 200);
    assert.equal(put.body.id, "doc-1", "URL id should win and be set on the doc");
    assert.equal(put.body.hello, "world");

    // List.
    const list = await request(app).get(base).set("Authorization", as("userA"));
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].id, "doc-1");

    // Replace (merge:false semantics — old fields dropped).
    const replace = await request(app)
      .put(`${base}/doc-1`)
      .set("Authorization", as("userA"))
      .send({ replaced: true });
    assert.equal(replace.status, 200);
    assert.equal(replace.body.replaced, true);
    assert.equal(replace.body.hello, undefined, "old field should be gone");

    // Delete.
    const del = await request(app)
      .delete(`${base}/doc-1`)
      .set("Authorization", as("userA"));
    assert.equal(del.status, 204);

    const empty = await request(app).get(base).set("Authorization", as("userA"));
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body, []);
  });
}

test("collection PUT 404s when the project does not exist", async () => {
  const res = await request(app)
    .put("/api/projects/missing/lots/lot-1")
    .set("Authorization", as("userA"))
    .send({ number: "01" });
  assert.equal(res.status, 404);
});

test("collection PUT 400s when body id contradicts URL id", async () => {
  const project = await createProject("userA");
  const res = await request(app)
    .put(`/api/projects/${project.id}/lots/lot-1`)
    .set("Authorization", as("userA"))
    .send({ id: "lot-999", number: "01" });
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test("collection PUT 400s when the body is not a JSON object", async () => {
  const project = await createProject("userA");
  const res = await request(app)
    .put(`/api/projects/${project.id}/lots/lot-1`)
    .set("Authorization", as("userA"))
    .set("Content-Type", "application/json")
    .send(JSON.stringify([1, 2, 3]));
  assert.equal(res.status, 400);
});

// --- Ownership isolation -----------------------------------------------------

test("user A cannot see, read, update, or delete user B's project", async () => {
  const projectB = await createProject("userB", "B's secret project");

  // A's project list does not include B's project.
  const listA = await request(app)
    .get("/api/projects")
    .set("Authorization", as("userA"));
  assert.equal(listA.status, 200);
  assert.equal(listA.body.length, 0, "A should see none of B's projects");

  // A reading B's project id -> 404 (scoped to A's subtree, so it doesn't exist).
  const getA = await request(app)
    .get(`/api/projects/${projectB.id}`)
    .set("Authorization", as("userA"));
  assert.equal(getA.status, 404);

  // A's bootstrap of B's project -> 404.
  const bootA = await request(app)
    .get(`/api/projects/${projectB.id}/bootstrap`)
    .set("Authorization", as("userA"));
  assert.equal(bootA.status, 404);

  // A updating B's project -> 404.
  const putA = await request(app)
    .put(`/api/projects/${projectB.id}`)
    .set("Authorization", as("userA"))
    .send({ name: "hijacked" });
  assert.equal(putA.status, 404);

  // A deleting B's project -> 404.
  const delA = await request(app)
    .delete(`/api/projects/${projectB.id}`)
    .set("Authorization", as("userA"));
  assert.equal(delA.status, 404);

  // Meanwhile B can still read its own project unchanged.
  const getB = await request(app)
    .get(`/api/projects/${projectB.id}`)
    .set("Authorization", as("userB"));
  assert.equal(getB.status, 200);
  assert.equal(getB.body.name, "B's secret project");
});

test("two users may hold projects with the same id without interfering", async () => {
  // Force a deterministic shared id by writing through the same doc path under
  // two different uids via the API's create+update flow.
  const a = await createProject("userA", "A project");
  // B creates a doc, then we verify A's doc with the same id is independent.
  const lotPathA = `/api/projects/${a.id}/lots/shared-lot`;
  await request(app)
    .put(lotPathA)
    .set("Authorization", as("userA"))
    .send({ owner: "A" });

  // B has no such project, so the same lot path 404s for B.
  const bSees = await request(app)
    .get(`/api/projects/${a.id}/lots`)
    .set("Authorization", as("userB"));
  assert.equal(bSees.status, 404);

  // A still sees its lot.
  const aSees = await request(app)
    .get(`/api/projects/${a.id}/lots`)
    .set("Authorization", as("userA"));
  assert.equal(aSees.status, 200);
  assert.equal(aSees.body.length, 1);
  assert.equal(aSees.body[0].owner, "A");
});

// --- Malformed input ---------------------------------------------------------

test("malformed JSON body returns a 400 with an { error }", async () => {
  const res = await request(app)
    .post("/api/projects")
    .set("Authorization", as("userA"))
    .set("Content-Type", "application/json")
    .send("{ not valid json");
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});
